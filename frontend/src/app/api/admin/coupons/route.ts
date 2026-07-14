import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// ── GET /api/admin/coupons ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data ?? [] });
}

// ── POST /api/admin/coupons ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at, active } = body;

  if (!code || !discount_type || discount_value == null)
    return NextResponse.json({ error: 'code, discount_type and discount_value are required.' }, { status: 400 });
  if (!['percentage', 'fixed'].includes(discount_type))
    return NextResponse.json({ error: 'discount_type must be percentage or fixed.' }, { status: 400 });
  if (discount_type === 'percentage' && (Number(discount_value) <= 0 || Number(discount_value) > 100))
    return NextResponse.json({ error: 'Percentage discount must be 1–100.' }, { status: 400 });
  if (Number(discount_value) <= 0)
    return NextResponse.json({ error: 'discount_value must be greater than 0.' }, { status: 400 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('coupons')
    .insert({
      code:             code.trim().toUpperCase(),
      description:      description || null,
      discount_type,
      discount_value:   Number(discount_value),
      min_order_amount: min_order_amount ? Number(min_order_amount) : null,
      max_uses:         max_uses ? Number(max_uses) : null,
      expires_at:       expires_at || null,
      active:           active !== false,
      used_count:       0,
    })
    .select()
    .single();

  if (error) {
    const msg = error.message.includes('unique') ? 'A coupon with that code already exists.' : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ coupon: data }, { status: 201 });
}

// ── PATCH /api/admin/coupons ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  // Normalise code if provided
  if (fields.code) fields.code = fields.code.trim().toUpperCase();
  if (fields.discount_value !== undefined) fields.discount_value = Number(fields.discount_value);
  if (fields.min_order_amount !== undefined) fields.min_order_amount = fields.min_order_amount ? Number(fields.min_order_amount) : null;
  if (fields.max_uses !== undefined) fields.max_uses = fields.max_uses ? Number(fields.max_uses) : null;
  if (fields.expires_at !== undefined) fields.expires_at = fields.expires_at || null;

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('coupons')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupon: data });
}

// ── DELETE /api/admin/coupons ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const sb = getServiceSupabase();
  const { error } = await sb.from('coupons').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
