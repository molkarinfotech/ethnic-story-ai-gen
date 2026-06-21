import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // 1. Orders directly linked by user_id
  const { data: byId } = await sb
    .from('orders')
    .select('id, created_at, amount_aud, status, items, customer_name, customer_email, customer_phone, shipping_address, stripe_payment_intent_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // 2. Orders with no user_id but matching the auth email (pre-user_id-stamp legacy orders)
  const { data: byEmail } = await sb
    .from('orders')
    .select('id, created_at, amount_aud, status, items, customer_name, customer_email, customer_phone, shipping_address, stripe_payment_intent_id')
    .is('user_id', null)
    .ilike('customer_email', user.email ?? '')
    .order('created_at', { ascending: false });

  // 3. Merge + deduplicate
  const seen = new Set<string>();
  const orders = [...(byId ?? []), ...(byEmail ?? [])].filter(o => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  // 4. Back-fill user_id on any email-matched orders so future queries find them by user_id
  const legacyIds = (byEmail ?? []).map(o => o.id);
  if (legacyIds.length > 0) {
    sb.from('orders').update({ user_id: user.id }).in('id', legacyIds).then(() => {});
  }

  return NextResponse.json(orders);
}
