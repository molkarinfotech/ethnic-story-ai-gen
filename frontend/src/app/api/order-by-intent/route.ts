import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const intentId = req.nextUrl.searchParams.get('payment_intent');
  if (!intentId) return NextResponse.json({ error: 'Missing payment_intent' }, { status: 400 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('orders')
    .select('id, created_at, amount_aud, status, items, customer_name, customer_email, customer_phone, shipping_address, stripe_payment_intent_id')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json(data);
}
