/**
 * GET /api/rewards/points
 * Returns the authenticated user's total points and point history.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

/** Extract the Supabase JWT from the chunked or legacy session cookie. */
function getTokenFromRequest(req: NextRequest): string | null {
  // Legacy cookie used by older Supabase setups
  const legacy = req.cookies.get('sb-access-token')?.value;
  if (legacy) return legacy;

  // New chunked cookie: sb-<project-ref>-auth-token  (may be split into .0, .1, …)
  // Collect all matching chunks and join them
  const chunks: string[] = [];
  let i = 0;
  while (true) {
    const chunk = req.cookies.get(
      i === 0 ? 'sb-jcqywnbawpwtuaujqyyt-auth-token'
              : `sb-jcqywnbawpwtuaujqyyt-auth-token.${i - 1}`,
    )?.value;
    if (!chunk) break;
    chunks.push(chunk);
    i++;
  }
  if (chunks.length > 0) {
    try {
      const session = JSON.parse(chunks.join(''));
      return session?.access_token ?? null;
    } catch {
      return chunks[0]; // might already be a raw JWT
    }
  }

  // Fallback: Authorization header
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify token and get user via service role
  const svc = getServiceSupabase();
  const { data: { user }, error: authErr } = await svc.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [summaryRes, historyRes] = await Promise.all([
    svc
      .from('user_points_summary')
      .select('total_points')
      .eq('user_id', user.id)
      .maybeSingle(),
    svc
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
