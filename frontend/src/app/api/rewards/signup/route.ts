/**
 * POST /api/rewards/signup
 * Safe to call after auth — the DB trigger on auth.users already awards 50 pts
 * via trg_signup_points (idempotent). This route is a no-op if points were already
 * awarded, returning the current balance instead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../../../lib/supabase';

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

export async function POST(req: NextRequest) {
  const sbUser = getSupabaseUser(req);
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = getServiceSupabase();

  // The DB trigger awards 50 pts on new user creation — this is idempotent via
  // ON CONFLICT (idempotency_key) DO NOTHING, so calling it again is safe.
  await svc.rpc('award_points', {
    p_user_id:  user.id,
    p_action:   'signup',
    p_points:   50,
    p_ref_id:   user.id,
    p_idem_key: `signup:${user.id}`,
  });

  // Return current balance
  const { data: summary } = await svc
    .from('user_points_summary')
    .select('total_points')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({
    ok: true,
    points_awarded: 50,
    total_points: summary?.total_points ?? 0,
  });
}
