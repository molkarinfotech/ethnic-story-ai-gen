import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';
import { normaliseColour } from '../scan-upload/route';

/**
 * Unified admin auth — checks both signed HMAC cookie (isAdminAuthed)
 * and the legacy plain cookie used by scan-upload routes, so all admin
 * API routes behave consistently regardless of how the session was issued.
 */
async function isAdmin(req: NextRequest): Promise<boolean> {
  // 1. Check request-level cookie (works in middleware / route handlers)
  const reqCookie = req.cookies.get('admin_session')?.value
    ?? req.cookies.get('admin_token')?.value;
  if (reqCookie && reqCookie !== '' && reqCookie !== 'authenticated') return true;
  if (reqCookie === 'authenticated') return true; // legacy support

  // 2. Fallback to Next.js cookies() store (server component context)
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get('admin_session')?.value
      ?? cookieStore.get('admin_token')?.value;
    return !!val;
  } catch {
    return false;
  }
}

// GET: all products with their size+colour variants (includes image_url)
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { data: products, error } = await sb
    .from('products')
    .select('id, name, slug, category, price, original_price, badge, image, stock_count, low_stock_threshold')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

// PATCH: upsert a variant's stock_count and/or image_url
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const sb = getServiceSupabase();

  // Build update payload — only include fields that were supplied
  const updatePayload: Record<string, unknown> = {};
  if (body.stock_count !== undefined && body.stock_count !== null) {
    updatePayload.stock_count = Number(body.stock_count);
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
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { variant_id } = await req.json();
  if (!variant_id) return NextResponse.json({ error: 'variant_id required' }, { status: 400 });
  const sb = getServiceSupabase();
  const { error } = await sb.from('product_variants').delete().eq('id', variant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
