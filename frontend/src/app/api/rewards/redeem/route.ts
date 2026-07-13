/**
 * POST /api/rewards/redeem  { points: number }
 * Converts points into a single-use coupon code.
 * Minimum 200 pts = $2.50 AUD (80 pts = $1 AUD).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../../../lib/supabase';

const RATE_PTS_PER_DOLLAR = 80; // 80 pts = $1 AUD
const MIN_REDEEM_PTS      = 200;

function getSupabaseUser(req: NextRequest) {
  const token =
    req.cookies.get('sb-access-token')?.value ??
    req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

function generateCoupon(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ES-${rand}`;
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseUser(req);
  if (!sb) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { points?: number };
  const points = body.points;

  if (!points || typeof points !== 'number' || points < MIN_REDEEM_PTS) {
    return NextResponse.json(
      { error: `Minimum redemption is ${MIN_REDEEM_PTS} points` },
      { status: 400 },
    );
  }

  const svc = getServiceSupabase();

  // Check balance via view (service role bypasses RLS)
  const { data: summary } = await svc
    .from('user_points_summary')
    .select('total_points')
    .eq('user_id', user.id)
    .maybeSingle();

  const available = summary?.total_points ?? 0;
  if (available < points) {
    return NextResponse.json(
      { error: `Insufficient points. You have ${available} pts.` },
      { status: 400 },
    );
  }

  const discount    = parseFloat((points / RATE_PTS_PER_DOLLAR).toFixed(2));
  const coupon_code = generateCoupon();
  const idem_key    = `redeem:${user.id}:${coupon_code}`;

  // Deduct points (idempotent)
  const { error: deductErr } = await svc.rpc('award_points', {
    p_user_id:  user.id,
    p_action:   'redeem',
    p_points:   -points,
    p_ref_id:   coupon_code,
    p_idem_key: idem_key,
  });
  if (deductErr) return NextResponse.json({ error: deductErr.message }, { status: 500 });

  // Record redemption
  const { error: redeemErr } = await svc.from('reward_redemptions').insert({
    user_id:      user.id,
    points_spent: points,
    coupon_code,
    discount_aud: discount,
  });
  if (redeemErr) return NextResponse.json({ error: redeemErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, coupon_code, discount_aud: discount, points_spent: points });
}

export async function GET(req: NextRequest) {
  // Return list of user's past redemptions
  const sb = getSupabaseUser(req);
  if (!sb) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = getServiceSupabase();
  const { data, error } = await svc
    .from('reward_redemptions')
    .select('coupon_code, points_spent, discount_aud, redeemed_at, used_at')
    .eq('user_id', user.id)
    .order('redeemed_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ redemptions: data ?? [] });
}
