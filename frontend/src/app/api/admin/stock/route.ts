import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function isAuthed() {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value;
  return token === process.env.ADMIN_SECRET;
}

// GET: all products with their size variants
export async function GET() {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getAdmin();
  const { data: products, error } = await sb
    .from('products')
    .select('id, name, category, stock_count, low_stock_threshold')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: variants } = await sb
    .from('product_variants')
    .select('id, product_id, size, stock_count')
    .order('product_id')
    .order('size');

  const result = (products ?? []).map(p => ({
    ...p,
    variants: (variants ?? []).filter(v => v.product_id === p.id),
  }));

  return NextResponse.json(result);
}

// PATCH: update a single variant stock count
export async function PATCH(req: NextRequest) {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const sb = getAdmin();

  // Update or create a variant
  if (body.variant_id) {
    const { error } = await sb
      .from('product_variants')
      .update({ stock_count: body.stock_count })
      .eq('id', body.variant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (body.product_id && body.size !== undefined) {
    // Upsert variant by product_id + size
    const { error } = await sb
      .from('product_variants')
      .upsert({ product_id: body.product_id, size: body.size, stock_count: body.stock_count }, { onConflict: 'product_id,size' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Fallback: update product-level stock
    const { error } = await sb.from('products').update({ stock_count: body.stock_count }).eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
