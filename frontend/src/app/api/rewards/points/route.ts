/**
 * GET /api/rewards/points
 * Returns the authenticated user's total points and point history.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseUser(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
  );
}

export async function GET(req: NextRequest) {
  const sb = getSupabaseUser(req);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [summaryRes, historyRes] = await Promise.all([
    sb.from('user_points_summary').select('total_points').eq('user_id', user.id).single(),
    sb.from('user_points').select('action, points, ref_id, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ]);

  return NextResponse.json({
    total: summaryRes.data?.total_points ?? 0,
    history: historyRes.data ?? [],
  });
}
