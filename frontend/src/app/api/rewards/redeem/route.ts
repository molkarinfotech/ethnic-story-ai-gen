/**
 * POST /api/rewards/redeem  { points: number }
 * Converts points into a single-use coupon code valid for 30 days.
 * Minimum 200 pts = $2.50 AUD (80 pts = $1 AUD).
 * The generated coupon is inserted into the `coupons` table so
 * validate-coupon accepts it at checkout.
 *
 * GET /api/rewards/redeem
 * Returns the user's redemption history (active + used).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

const RATE_PTS_PER_DOLLAR = 80;
const MIN_REDEEM_PTS      = 200;
const COUPON_VALIDITY_DAYS = 30;

/** Extract the Supabase JWT from chunked or legacy session cookie. */
function getTokenFromRequest(req: NextRequest): string | null {
  const legacy = req.cookies.get('sb-access-token')?.value;
  if (legacy) return legacy;

  // Chunked cookie: sb-<ref>-auth-token, sb-<ref>-auth-token.1, .2, ...
  const chunks: string[] = [];
  let i = 0;
  while (true) {
    const key = i === 0
      ? 'sb-jcqywnbawpwtuaujqyyt-auth-token'
      : `sb-jcqywnbawpwtuaujqyyt-auth-token.${i}`;
    const chunk = req.cookies.get(key)?.value;
    if (!chunk) break;
    chunks.push(chunk);
    i++;
  }
  if (chunks.length > 0) {
    try {
      const session = JSON.parse(chunks.join(''));
      return session?.access_token ?? null;
    } catch {
      return chunks[0];
    }
  }
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
}

function generateCouponCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ES-${rand}`;
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = getServiceSupabase();
  const { data: { user }, error: authErr } = await svc.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { points?: number };
  const points = body.points;

  if (!points || typeof points !== 'number' || points < MIN_REDEEM_PTS) {
    return NextResponse.json(
      { error: `Minimum redemption is ${MIN_REDEEM_PTS} points.` },
      { status: 400 },
    );
  }

  // ── Check balance ────────────────────────────────────────────────────────
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

  const discount_aud = parseFloat((points / RATE_PTS_PER_DOLLAR).toFixed(2));
  const coupon_code  = generateCouponCode();
  const idem_key     = `redeem:${user.id}:${coupon_code}`;

  // expires 30 days from now (ISO string)
  const expires_at = new Date(
    Date.now() + COUPON_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // ── 1. Deduct points (idempotent via award_points RPC) ───────────────────
  const { error: deductErr } = await svc.rpc('award_points', {
    p_user_id:  user.id,
    p_action:   'redeem',
    p_points:   -points,
    p_ref_id:   coupon_code,
    p_idem_key: idem_key,
  });
  if (deductErr) return NextResponse.json({ error: deductErr.message }, { status: 500 });

  // ── 2. Insert coupon into `coupons` table so validate-coupon accepts it ──
  const { error: couponInsertErr } = await svc.from('coupons').insert({
    code:             coupon_code,
    description:      `Rewards redemption — ${points} pts by ${user.email ?? user.id}`,
    discount_type:    'fixed',
    discount_value:   discount_aud,
    min_order_amount: null,
    max_uses:         1,         // single-use
    used_count:       0,
    active:           true,
    expires_at,
  });
  if (couponInsertErr) {
    // Rollback: re-award the deducted points so balance stays consistent
    await svc.rpc('award_points', {
      p_user_id:  user.id,
      p_action:   'redeem_rollback',
      p_points:   points,
      p_ref_id:   coupon_code,
      p_idem_key: `${idem_key}:rollback`,
    });
    return NextResponse.json({ error: 'Failed to create coupon. Points have been refunded.' }, { status: 500 });
  }

  // ── 3. Record redemption in reward_redemptions for account history ────────
  const { error: redeemErr } = await svc.from('reward_redemptions').insert({
    user_id:      user.id,
    points_spent: points,
    coupon_code,
    discount_aud,
    expires_at,
  });
  // Non-fatal — coupon is usable even if this row fails
  if (redeemErr) console.error('[rewards/redeem] reward_redemptions insert:', redeemErr.message);

  return NextResponse.json({
    ok:           true,
    coupon_code,
    discount_aud,
    points_spent: points,
    expires_at,
  });
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = getServiceSupabase();
  const { data: { user }, error: authErr } = await svc.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await svc
    .from('reward_redemptions')
    .select('coupon_code, points_spent, discount_aud, redeemed_at, used_at, expires_at')
    .eq('user_id', user.id)
    .order('redeemed_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ redemptions: data ?? [] });
}
