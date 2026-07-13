/**
 * POST /api/rewards/review
 * Submit a product review. Verifies purchase before marking verified_purchase=true.
 * 25 pts awarded via DB trigger when verified_purchase is true.
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

export async function POST(req: NextRequest) {
  const sb = getSupabaseUser(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required to review' }, { status: 401 });

  const { product_id, order_id, rating, title, body } = await req.json();
  if (!product_id || !rating || !body) {
    return NextResponse.json({ error: 'product_id, rating and body are required' }, { status: 400 });
  }

  // Check for duplicate review
  const { data: existing } = await sb.from('product_reviews')
    .select('id').eq('user_id', user.id).eq('product_id', product_id).maybeSingle();
  if (existing) return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 });

  // Verify purchase if order_id supplied
  let verified_purchase = false;
  if (order_id) {
    const { data: order } = await sb.from('orders')
      .select('id, items').eq('id', order_id).eq('user_id', user.id).maybeSingle();
    if (order) verified_purchase = true;
  } else {
    // No order_id? Check any order containing this product
    const { data: orders } = await sb.from('orders')
      .select('id, items').eq('user_id', user.id).eq('status', 'paid');
    if (orders) {
      verified_purchase = orders.some(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        return items.some((i: any) => i.product_id === product_id || i.id === product_id);
      });
    }
  }

  const { data, error } = await sb.from('product_reviews').insert({
    user_id: user.id,
    product_id,
    order_id: order_id ?? null,
    rating,
    title: title ?? null,
    body,
    verified_purchase,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    review: data,
    verified_purchase,
    points_earned: verified_purchase ? 25 : 0,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get('product_id');
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await sb.from('product_reviews')
    .select('id, rating, title, body, verified_purchase, created_at')
    .eq('product_id', product_id).order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}
