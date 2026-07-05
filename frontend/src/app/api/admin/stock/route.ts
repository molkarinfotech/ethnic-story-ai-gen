import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';
import { normaliseColour } from '../scan-upload/route';

/**
 * Unified admin auth — identical to the logic in scan-upload/route.ts.
 * Checks req.cookies first (reliable in Next.js 15 route handlers),
 * then falls back to the cookies() store.
 */
async function isAdmin(req: NextRequest): Promise<boolean> {
  const reqCookie = req.cookies.get('admin_session')?.value
    ?? req.cookies.get('admin_token')?.value;
  if (reqCookie) return true;

  try {
    const cookieStore = await cookies();
    const val = cookieStore.get('admin_session')?.value
      ?? cookieStore.get('admin_token')?.value;
    return !!val;
  } catch {
    return false;
  }
}

// GET: all products with their variants.
// IMPORTANT: we return ALL variant rows including __colour__ anchor rows
// so the frontend knows which colour groups exist even before any real
// size is added. The frontend filters out __colour__ from stock display.
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { data: products, error } = await sb
    .from('products')
    .select('id, name, slug, category, price, original_price, badge, image, stock_count, low_stock_threshold')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch ALL variants including __colour__ anchor rows
  const { data: variants } = await sb
    .from('product_variants')
    .select('id, product_id, size, colour, stock_count, image_url');

  const result = (products ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    stock_count: Number(p.stock_count),
    variants: (variants ?? [])
      .filter((v: Record<string, unknown>) => v.product_id === p.id)
      .map((v: Record<string, unknown>) => ({
        ...v,
        colour:      (v.colour as string) ?? '',
        stock_count: Number(v.stock_count),
        image_url:   (v.image_url as string) ?? null,
      })),
  }));

  return NextResponse.json(result);
}

// PATCH: upsert a variant — works even without a DB unique constraint
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const sb = getServiceSupabase();

  // --- Path 1: direct update by variant PK ---
  if (body.variant_id) {
    const updatePayload: Record<string, unknown> = {};
    if (body.stock_count !== undefined) updatePayload.stock_count = Number(body.stock_count);
    if (body.image_url   !== undefined) updatePayload.image_url   = body.image_url;
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    const { error } = await sb
      .from('product_variants')
      .update(updatePayload)
      .eq('id', body.variant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // --- Path 2: upsert by product_id + size + colour ---
  if (!body.product_id || body.size === undefined) {
    return NextResponse.json({ error: 'Missing variant_id or product_id+size' }, { status: 400 });
  }

  // IMPORTANT: when looking up an existing variant we must use the EXACT colour
  // string that is already stored in the DB. Calling normaliseColour() here would
  // convert '' → 'Unassigned', causing the SELECT to miss existing rows with
  // colour='' and triggering a duplicate INSERT instead of an UPDATE.
  // We only normalise when actually inserting a brand-new row so that new data
  // is stored consistently.
  const rawColour   = (body.colour as string | undefined | null) ?? '';
  const stock_count = body.stock_count !== undefined ? Number(body.stock_count) : 0;
  const image_url   = body.image_url ?? null;

  const { data: existing } = await sb
    .from('product_variants')
    .select('id')
    .eq('product_id', body.product_id)
    .eq('size', body.size)
    .eq('colour', rawColour)
    .maybeSingle();

  if (existing?.id) {
    // UPDATE — preserve the existing colour value (don't rename it)
    const updatePayload: Record<string, unknown> = { stock_count };
    if (image_url !== null) updatePayload.image_url = image_url;
    const { error } = await sb
      .from('product_variants')
      .update(updatePayload)
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // INSERT — normalise colour so new rows are stored consistently
    const colour = normaliseColour(rawColour);
    const insertPayload: Record<string, unknown> = {
      product_id:  body.product_id,
      size:        body.size,
      colour,
      stock_count,
    };
    if (image_url !== null) insertPayload.image_url = image_url;
    const { error } = await sb
      .from('product_variants')
      .insert(insertPayload);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: remove a size variant entirely
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { variant_id } = await req.json();
  if (!variant_id) return NextResponse.json({ error: 'variant_id required' }, { status: 400 });
  const sb = getServiceSupabase();
  const { error } = await sb.from('product_variants').delete().eq('id', variant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
