import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  const chunks: string[] = [];
  let i = 0;
  while (true) {
    const chunk =
      req.cookies.get(`sb-jcqywnbawpwtuaujqyyt-auth-token.${i}`)?.value ??
      req.cookies.get(`sb-jcqywnbawpwtuaujqyyt-auth-token${i === 0 ? '' : `.${i}`}`)?.value;
    if (!chunk) break;
    chunks.push(chunk);
    i++;
  }
  if (chunks.length) {
    try {
      const parsed = JSON.parse(chunks.join(''));
      return parsed.access_token ?? null;
    } catch { /* ignore */ }
  }

  return req.cookies.get('sb-access-token')?.value ?? null;
}

// ── GET /api/likes?product_id=xxx ────────────────────────────
// Returns { liked: bool, count: number } for the calling user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const sb    = getServiceSupabase();
  const token = getToken(req);

  // Total like count (public)
  const { count: total } = await sb
    .from('product_likes')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (!token) return NextResponse.json({ liked: false, count: total ?? 0 });

  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ liked: false, count: total ?? 0 });

  const { data: existing } = await sb
    .from('product_likes')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ liked: !!existing, count: total ?? 0 });
}

// ── POST /api/likes ───────────────────────────────────────────
// Body: { product_id }  — toggles like on/off, awards/deducts 10 pts
export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  const { product_id } = await req.json();
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  // Check existing like
  const { data: existing } = await sb
    .from('product_likes')
    .select('id')
    .eq('product_id', product_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Unlike — remove row + deduct 10 pts
    await sb.from('product_likes').delete().eq('id', existing.id);
    await sb.rpc('award_points', {
      p_user_id: user.id,
      p_action:  'like',
      p_points:  -10,
      p_ref_id:  product_id,
    });
    const { count } = await sb
      .from('product_likes').select('id', { count: 'exact', head: true }).eq('product_id', product_id);
    return NextResponse.json({ liked: false, count: count ?? 0 });
  } else {
    // Like — insert row + award 10 pts
    await sb.from('product_likes').insert({ product_id, user_id: user.id });
    await sb.rpc('award_points', {
      p_user_id: user.id,
      p_action:  'like',
      p_points:  10,
      p_ref_id:  product_id,
    });
    const { count } = await sb
      .from('product_likes').select('id', { count: 'exact', head: true }).eq('product_id', product_id);
    return NextResponse.json({ liked: true, count: count ?? 0 });
  }
}
