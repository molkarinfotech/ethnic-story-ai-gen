import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../../lib/supabase';
import { storagePathFromUrl } from '../../../../../lib/storage-utils';

async function isAdmin(req: NextRequest): Promise<boolean> {
  const reqCookie = req.cookies.get('admin_session')?.value
    ?? req.cookies.get('admin_token')?.value;
  if (reqCookie && reqCookie !== '') return true;
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get('admin_session')?.value
      ?? cookieStore.get('admin_token')?.value;
    return !!val;
  } catch {
    return false;
  }
}

const LETTER_SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];

const ANCHOR_SIZES = new Set(['__colour__', 'TBA']);

function sortVariantsForShop(
  variants: { id: string; size: string; colour?: string; stock_count: number; price?: number }[]
) {
  const real    = variants.filter(v => !ANCHOR_SIZES.has(v.size));
  const letter  = real.filter(v => LETTER_SIZE_ORDER.includes(v.size))
    .sort((a, b) => LETTER_SIZE_ORDER.indexOf(a.size) - LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = real.filter(v => /^\d/.test(v.size))
    .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const other   = real.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

void sortVariantsForShop;

const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'slug', 'category', 'subcategory', 'gender', 'price', 'original_price', 'badge',
  'image', 'in_stock', 'stock_count', 'subtitle', 'description',
  'genders', 'tags', 'sort_order', 'is_featured', 'meta_title', 'meta_description',
  'cost_inr', 'landed_cost_aud',
]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sb = getServiceSupabase();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let query = sb
    .from('products')
    .select('id, name, slug, category, subcategory, gender, price, original_price, badge, image, in_stock, stock_count, cost_inr, landed_cost_aud, created_at');
  query = isUuid ? query.eq('id', id) : query.eq('slug', id);

  const { data: product, error: prodErr } = await query.single();
  if (prodErr || !product) {
    return NextResponse.json({ error: prodErr?.message ?? 'Not found' }, { status: 404 });
  }

  const { data: imgRows } = await sb
    .from('product_images')
    .select('url, sort_order')
    .eq('product_id', product.id)
    .order('sort_order', { ascending: true })
    .limit(1);

  const firstGalleryImage = imgRows?.[0]?.url ?? null;

  const { data: variants, error: varErr } = await sb
    .from('product_variants')
    .select('id, size, colour, stock_count, price')
    .eq('product_id', product.id);

  if (varErr) {
    console.error('[products/[id] GET] variants error:', varErr);
  }

  return NextResponse.json({
    ...product,
    image: firstGalleryImage ?? product.image ?? null,
    variants: variants ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const safeUpdate: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) safeUpdate[key] = value;
  }

  if (Object.keys(safeUpdate).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb.from('products').update(safeUpdate).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sb = getServiceSupabase();

  const { data: imageRows } = await sb
    .from('product_images')
    .select('url')
    .eq('product_id', id);

  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (imageRows && imageRows.length > 0) {
    const byBucket: Record<string, string[]> = {};
    for (const row of imageRows) {
      const loc = storagePathFromUrl(row.url);
      if (loc) {
        if (!byBucket[loc.bucket]) byBucket[loc.bucket] = [];
        byBucket[loc.bucket].push(loc.storagePath);
      }
    }
    for (const [bucket, paths] of Object.entries(byBucket)) {
      const { error: storageErr } = await sb.storage.from(bucket).remove(paths);
      if (storageErr) {
        console.warn(`[products DELETE] storage removal failed for bucket "${bucket}":`, storageErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
