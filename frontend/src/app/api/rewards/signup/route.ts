/**
 * POST /api/rewards/signup
 * Called by the auth callback after a new user is created.
 * Awards 50 pts. Idempotent — safe to call multiple times.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export async function POST(req: NextRequest) {
  // Validate the user JWT supplied in the request
  const token =
    req.cookies.get('sb-access-token')?.value ??
    req.headers.get('authorization')?.replace('Bearer ', '');

  const { createClient } = await import('@supabase/supabase-js');
  const sbUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined,
  );
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Idempotent insert via service role
  const sb = getServiceSupabase();
  const { error } = await sb.from('user_points').insert({
    user_id: user.id,
    action: 'signup',
    points: 50,
    ref_id: user.id,
    idempotency_key: `signup:${user.id}`,
  }).onConflict('idempotency_key').ignore();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, points_earned: 50 });
}
