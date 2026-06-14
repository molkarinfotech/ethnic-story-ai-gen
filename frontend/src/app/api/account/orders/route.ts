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

  // Query by user_id first
  const { data: byId } = await sb
    .from('orders')
    .select('id, created_at, amount_aud, status, items, customer_name, customer_email, customer_phone, shipping_address, stripe_payment_intent_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fallback: orders placed before user_id was stamped (matched by email)
  const { data: byEmail } = await sb
    .from('orders')
    .select('id, created_at, amount_aud, status, items, customer_name, customer_email, customer_phone, shipping_address, stripe_payment_intent_id')
    .is('user_id', null)
    .eq('customer_email', user.email)
    .order('created_at', { ascending: false });

  // Merge + deduplicate
  const seen = new Set<string>();
  const orders = [...(byId ?? []), ...(byEmail ?? [])].filter(o => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  // Back-fill user_id on legacy orders
  const legacyIds = (byEmail ?? []).map(o => o.id);
  if (legacyIds.length > 0) {
    await sb.from('orders').update({ user_id: user.id }).in('id', legacyIds);
  }

  return NextResponse.json(orders);
}
