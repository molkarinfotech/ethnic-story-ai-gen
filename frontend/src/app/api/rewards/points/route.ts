/**
 * GET /api/rewards/points
 * Returns the authenticated user's total points and point history.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

/** Extract the Supabase JWT — matches the helper used across all other routes. */
function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

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
  if (chunks.length) {
    try {
      const parsed = JSON.parse(chunks.join(''));
      return parsed.access_token ?? null;
    } catch {
      return chunks[0]; // raw JWT fallback
    }
  }

  return req.cookies.get('sb-access-token')?.value ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
