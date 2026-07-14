import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/validate-coupon
 * Body: { code: string; subtotal: number }
 * Returns: { valid, discount_type, discount_value, discount_amount, min_order_amount, description }
 *
 * Table: coupons
 *   id            uuid PK
 *   code          text UNIQUE (case-insensitive stored as uppercase)
 *   description   text nullable
 *   discount_type 'percentage' | 'fixed'
 *   discount_value number  (e.g. 10 = 10% or $10 off)
 *   min_order_amount number nullable (minimum subtotal to apply)
 *   max_uses      int nullable (null = unlimited)
 *   used_count    int default 0
 *   active        boolean default true
 *   expires_at    timestamp nullable
 *   created_at    timestamp
 */
export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();
  if (!code || typeof code !== 'string')
    return NextResponse.json({ valid: false, error: 'Coupon code is required.' }, { status: 400 });

  const sb = getServiceSupabase();
  const { data: coupon, error } = await sb
    .from('coupons')
    .select('id, code, description, discount_type, discount_value, min_order_amount, max_uses, used_count, expires_at, active')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();

  if (error) return NextResponse.json({ valid: false, error: 'Server error.' }, { status: 500 });
  if (!coupon) return NextResponse.json({ valid: false, error: 'Invalid coupon code.' });
  if (!coupon.active) return NextResponse.json({ valid: false, error: 'This coupon is no longer active.' });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
    return NextResponse.json({ valid: false, error: 'This coupon has expired.' });
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses)
    return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit.' });

  const sub = Number(subtotal ?? 0);
  if (coupon.min_order_amount && sub < coupon.min_order_amount)
    return NextResponse.json({ valid: false, error: `Minimum order of $${coupon.min_order_amount.toFixed(2)} required.` });

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = Math.min(sub, (sub * coupon.discount_value) / 100);
  } else {
    discountAmount = Math.min(sub, coupon.discount_value);
  }
  discountAmount = Math.round(discountAmount * 100) / 100;

  return NextResponse.json({
    valid: true,
    coupon_id:       coupon.id,
    code:            coupon.code,
    description:     coupon.description ?? null,
    discount_type:   coupon.discount_type,
    discount_value:  coupon.discount_value,
    discount_amount: discountAmount,
    min_order_amount: coupon.min_order_amount ?? null,
  });
}
