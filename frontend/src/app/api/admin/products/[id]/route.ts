import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../../lib/supabase';
import { isAdminAuthed } from '../../../../../lib/admin-auth';

const LETTER_SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];

function sortVariants(variants: { id: string; size: string; colour?: string; stock_count: number; price?: number }[]) {
  const letter  = variants.filter(v => LETTER_SIZE_ORDER.includes(v.size))
    .sort((a, b) => LETTER_SIZE_ORDER.indexOf(a.size) - LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = variants.filter(v => /^\d/.test(v.size))
    .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const other   = variants.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

// Whitelist of product fields an admin is allowed to update.
const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'slug', 'category', 'subcategory', 'gender', 'price', 'original_price', 'badge',
  'image', 'in_stock', 'stock_count', 'subtitle', 'description',
  'genders', 'tags', 'sort_order', 'is_featured', 'meta_title', 'meta_description',
]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sb = getServiceSupabase();

  // Support both UUID and slug lookups
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let query = sb
    .from('products')
    .select('id, name, slug, category, subcategory, gender, price, original_price, badge, image, in_stock, stock_count, created_at');
  query = isUuid ? query.eq('id', id) : query.eq('slug', id);

  const { data: product, error: prodErr } = await query.single();

  if (prodErr || !product) {
    return NextResponse.json({ error: prodErr?.message ?? 'Not found' }, { status: 404 });
  }

  // Resolve first gallery image
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
    variants: sortVariants(variants ?? []),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Only pass through whitelisted fields to prevent mass-assignment
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
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sb = getServiceSupabase();
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
