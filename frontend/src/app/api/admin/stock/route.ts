import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';
import { normaliseColour } from '../scan-upload/route';

// GET: all products with their size+colour variants (includes image_url)
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { data: products, error } = await sb
    .from('products')
    .select('id, name, slug, category, price, original_price, badge, image, stock_count, low_stock_threshold')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: variants } = await sb
    .from('product_variants')
    .select('id, product_id, size, colour, stock_count, image_url');

  const result = (products ?? []).map(p => ({
    ...p,
    stock_count: Number(p.stock_count),
    variants: (variants ?? [])
      .filter(v => v.product_id === p.id)
      .map(v => ({
        ...v,
        colour:      v.colour ?? '',
        stock_count: Number(v.stock_count),
        image_url:   v.image_url ?? null,
      })),
  }));

  return NextResponse.json(result);
}

// PATCH: upsert a variant's stock_count and/or image_url
// - body.variant_id  → update by PK (stock_count and/or image_url)
// - body.product_id + body.size → upsert on (product_id, size, colour)
// Colour is normalised to Title Case to match product_images.colour
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const sb = getServiceSupabase();

  // Build the update payload — only include fields that were supplied
  // stock_count may be undefined when the caller only wants to update image_url
  const updatePayload: Record<string, unknown> = {};
  if (body.stock_count !== undefined && body.stock_count !== null) {
    updatePayload.stock_count = body.stock_count;
  }
  if (body.image_url !== undefined && body.image_url !== null) {
    updatePayload.image_url = body.image_url;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'Nothing to update — supply stock_count and/or image_url' }, { status: 400 });
  }

  if (body.variant_id) {
    // Direct update by variant PK
    const { error } = await sb
      .from('product_variants')
      .update(updatePayload)
      .eq('id', body.variant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  } else if (body.product_id && body.size !== undefined) {
    // Upsert on (product_id, size, colour) — always include stock_count for upsert
    // If only image_url is being set and the row doesn't exist yet, default stock to 0
    const colour = normaliseColour(body.colour);
    const upsertPayload = {
      product_id:  body.product_id,
      size:        body.size,
      colour,
      stock_count: body.stock_count ?? 0,
      ...updatePayload,
    };
    const { error } = await sb
      .from('product_variants')
      .upsert(upsertPayload, { onConflict: 'product_id,size,colour' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  } else {
    return NextResponse.json({ error: 'Missing variant_id or product_id+size' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: remove a size variant entirely
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 400 });
  const { variant_id } = await req.json();
  if (!variant_id) return NextResponse.json({ error: 'variant_id required' }, { status: 400 });
  const sb = getServiceSupabase();
  const { error } = await sb.from('product_variants').delete().eq('id', variant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
