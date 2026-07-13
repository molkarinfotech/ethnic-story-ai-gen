/**
 * GET /api/rewards/points
 * Returns the authenticated user's total points and point history.
 * Uses user_points_summary view for the running total.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const sb = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [summaryRes, historyRes] = await Promise.all([
    sb
      .from('user_points_summary')
      .select('total_points')
      .eq('user_id', user.id)
      .maybeSingle(),
    sb
      .from('user_points')
      .select('action, points, ref_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    total:   summaryRes.data?.total_points ?? 0,
    history: historyRes.data ?? [],
  });
}
