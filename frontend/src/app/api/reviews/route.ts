import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  // Try chunked Supabase cookie (sb-<ref>-auth-token.0, .1, ...)
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

// ── GET /api/reviews?product_id=xxx&page=1&limit=10 ─────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  const page      = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit     = Math.min(50, parseInt(searchParams.get('limit') ?? '10', 10));
  const from      = (page - 1) * limit;

  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const sb = getServiceSupabase();
  const { data, error, count } = await sb
    .from('product_reviews')
    .select('id, rating, body, created_at, user_id, profiles(display_name, avatar_url)', { count: 'exact' })
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [], total: count ?? 0, page, limit });
}

// ── POST /api/reviews ────────────────────────────────────────
// Body: { product_id, rating (1-5), body? }
export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  const { product_id, rating, body: reviewBody } = await req.json();
  if (!product_id || typeof rating !== 'number' || rating < 1 || rating > 5)
    return NextResponse.json({ error: 'product_id and rating (1-5) required' }, { status: 400 });

  // Upsert: one review per user per product
  const { data: existing } = await sb
    .from('product_reviews')
    .select('id')
    .eq('product_id', product_id)
    .eq('user_id', user.id)
    .maybeSingle();

  let result;
  if (existing) {
    result = await sb
      .from('product_reviews')
      .update({ rating, body: reviewBody ?? null, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    result = await sb
      .from('product_reviews')
      .insert({ product_id, user_id: user.id, rating, body: reviewBody ?? null })
      .select()
      .single();

    // Award 25 pts for first review on this product
    if (!result.error) {
      await sb.rpc('award_points', {
        p_user_id: user.id,
        p_action:  'review',
        p_points:  25,
        p_ref_id:  product_id,
      });
    }
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ review: result.data }, { status: existing ? 200 : 201 });
}
