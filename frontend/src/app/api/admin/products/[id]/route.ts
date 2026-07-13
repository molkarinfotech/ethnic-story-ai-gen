import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../../lib/supabase';

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

/** Derive the Supabase Storage path from a public URL.
 *  URLs look like: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function storagePathFromUrl(url: string): { bucket: string; storagePath: string } | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], storagePath: match[2] };
  } catch {
    return null;
  }
}

const LETTER_SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];

// Sizes that are internal bookkeeping anchors — never shown to shoppers
// but kept in the DB so colour groups survive before any real size is added.
const ANCHOR_SIZES = new Set(['__colour__', 'TBA']);

function sortVariantsForShop(
  variants: { id: string; size: string; colour?: string; stock_count: number; price?: number }[]
) {
  // Strip anchor rows for storefront/stock-list use (GET /api/admin/stock uses this too)
  const real    = variants.filter(v => !ANCHOR_SIZES.has(v.size));
  const letter  = real.filter(v => LETTER_SIZE_ORDER.includes(v.size))
    .sort((a, b) => LETTER_SIZE_ORDER.indexOf(a.size) - LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = real.filter(v => /^\d/.test(v.size))
    .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const other   = real.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'slug', 'category', 'subcategory', 'gender', 'price', 'original_price', 'badge',
  'image', 'in_stock', 'stock_count', 'subtitle', 'description',
  'genders', 'tags', 'sort_order', 'is_featured', 'meta_title', 'meta_description',
]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sb = getServiceSupabase();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let query = sb
    .from('products')
    .select('id, name, slug, category, subcategory, gender, price, original_price, badge, image, in_stock, stock_count, created_at');
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

  // Return ALL variants including anchor rows (__colour__, TBA).
  // The admin inventory page client uses them for colour group derivation.
  // The client-side sortVariants() strips anchors from the size chips display.
  const { data: variants, error: varErr } = await sb
    .from('product_variants')
    .select('id, size, colour, stock_count, price')
    .eq('product_id', product.id);

  if (varErr) {
    console.error('[products/[id] GET] variants error:', varErr);
  }

  // For this admin endpoint we return all variants (including anchors).
  // Storefront endpoints should use sortVariantsForShop() to strip them.
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

  // 1. Fetch all images for this product so we can clean up storage
  const { data: imageRows } = await sb
    .from('product_images')
    .select('url')
    .eq('product_id', id);

  // 2. Delete the product (cascades to product_variants and product_images via FK)
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. Delete associated storage files grouped by bucket (best-effort)
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

/** Exported so the bulk-delete route can reuse the storage cleanup logic */
export { storagePathFromUrl };
