/**
 * POST /api/rewards/redeem  { points: number }
 * Converts points into a single-use coupon code.
 * Minimum 200 pts = $5 AUD discount (100 pts = $2.50).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../../../lib/supabase';

const RATE_PTS_PER_DOLLAR = 80; // 80 pts = $1 AUD
const MIN_REDEEM_PTS = 200;

function getSupabaseUser(req: NextRequest) {
  const token =
    req.cookies.get('sb-access-token')?.value ??
    req.headers.get('authorization')?.replace('Bearer ', '');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined,
  );
}

function generateCoupon(userId: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ES-${rand}`;
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseUser(req);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { points } = await req.json() as { points: number };
  if (!points || points < MIN_REDEEM_PTS) {
    return NextResponse.json(
      { error: `Minimum redemption is ${MIN_REDEEM_PTS} points` },
      { status: 400 },
    );
  }

  const svc = getServiceSupabase();

  // Check user has enough points
  const { data: summary } = await svc
    .from('user_points_summary')
    .select('total_points')
    .eq('user_id', user.id)
    .single();

  const available = summary?.total_points ?? 0;
  if (available < points) {
    return NextResponse.json(
      { error: `Insufficient points. You have ${available} pts.` },
      { status: 400 },
    );
  }

  const discount = parseFloat((points / RATE_PTS_PER_DOLLAR).toFixed(2));
  const coupon_code = generateCoupon(user.id);

  // Deduct points
  const { error: deductErr } = await svc.from('user_points').insert({
    user_id: user.id,
    action: 'redeem',
    points: -points,
    ref_id: coupon_code,
    idempotency_key: `redeem:${user.id}:${coupon_code}`,
  });
  if (deductErr) return NextResponse.json({ error: deductErr.message }, { status: 500 });

  // Record redemption
  const { error: redeemErr } = await svc.from('reward_redemptions').insert({
    user_id: user.id,
    points_spent: points,
    coupon_code,
    discount_aud: discount,
  });
  if (redeemErr) return NextResponse.json({ error: redeemErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, coupon_code, discount_aud: discount, points_spent: points });
}
