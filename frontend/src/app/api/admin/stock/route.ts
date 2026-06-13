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
    .select('id, name, slug, category, price, original_price, badge, image, stock_count, low_stock_threshold')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: variants } = await sb
    .from('product_variants')
    .select('id, product_id, size, stock_count');

  const result = (products ?? []).map(p => ({
    ...p,
    stock_count: Number(p.stock_count),
    variants: (variants ?? [])
      .filter(v => v.product_id === p.id)
      .map(v => ({ ...v, stock_count: Number(v.stock_count) })),
  }));

  return NextResponse.json(result);
}

// PATCH: upsert a variant stock count
export async function PATCH(req: NextRequest) {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const sb = getAdmin();

  if (body.variant_id) {
    const { error } = await sb
      .from('product_variants')
      .update({ stock_count: body.stock_count })
      .eq('id', body.variant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (body.product_id && body.size !== undefined) {
    const { error } = await sb
      .from('product_variants')
      .upsert({ product_id: body.product_id, size: body.size, stock_count: body.stock_count }, { onConflict: 'product_id,size' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: 'Missing variant_id or product_id+size' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: remove a size variant entirely
export async function DELETE(req: NextRequest) {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { variant_id } = await req.json();
  if (!variant_id) return NextResponse.json({ error: 'variant_id required' }, { status: 400 });
  const sb = getAdmin();
  const { error } = await sb.from('product_variants').delete().eq('id', variant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
