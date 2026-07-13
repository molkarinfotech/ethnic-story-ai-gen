/**
 * POST   /api/rewards/like  { product_id }
 * DELETE /api/rewards/like  { product_id }
 * Toggle a product like. Points awarded/removed via DB trigger (trg_like_points).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req: NextRequest) {
  const sb = getSupabaseUser(req);
  if (!sb) return NextResponse.json({ error: 'Login required to like products' }, { status: 401 });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required to like products' }, { status: 401 });

  const { product_id } = await req.json();
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const { error } = await sb.from('product_likes').insert({ user_id: user.id, product_id });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ liked: true, already: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Points awarded by DB trigger trg_like_points
  return NextResponse.json({ liked: true, points_earned: 10 });
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabaseUser(req);
  if (!sb) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { product_id } = await req.json();
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const { error } = await sb
    .from('product_likes')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', product_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Points removed by DB trigger trg_like_points DELETE branch
  return NextResponse.json({ liked: false });
}

export async function GET(req: NextRequest) {
  // Return all product_ids the user has liked
  const sb = getSupabaseUser(req);
  if (!sb) return NextResponse.json({ liked: [] });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ liked: [] });

  const { data, error } = await sb
    .from('product_likes')
    .select('product_id')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ liked: (data ?? []).map((r: any) => r.product_id) });
}
