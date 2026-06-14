import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

console.log('[stripe-webhook] Secret loaded:', webhookSecret ? webhookSecret.slice(0, 20) + '...' : 'NOT SET');

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature') ?? '';

  // Read raw bytes - critical for Stripe signature verification
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: 'No body' }, { status: 400 });
  }
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const rawBody = Buffer.concat(chunks.map(c => Buffer.from(c)));

  console.log('[stripe-webhook] Body length:', rawBody.length, '| sig present:', sig ? 'YES' : 'NO');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature validation failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[stripe-webhook] Event verified:', event.type, event.id);

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const m  = pi.metadata ?? {};

    console.log('[stripe-webhook] PI:', pi.id, '| amount:', pi.amount, '| metadata:', Object.keys(m).join(', '));

    let items: object[] = [];
    try { items = JSON.parse(m.items ?? '[]'); } catch { items = []; }

    const sb = getServiceSupabase();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
    console.log('[stripe-webhook] Service key set:', serviceKey ? 'YES (' + serviceKey.slice(0, 10) + '...)' : 'NO - INSERT WILL FAIL');

    const { error, data } = await sb.from('orders').insert({
      stripe_payment_intent_id: pi.id,
      amount_aud:               pi.amount / 100,
      status:                   'paid',
      customer_name:            m.customer_name  || null,
      customer_email:           m.customer_email || null,
      customer_phone:           m.customer_phone || null,
      shipping_address: {
        line1:    m.shipping_line1    || null,
        line2:    m.shipping_line2    || null,
        suburb:   m.shipping_suburb   || null,
        state:    m.shipping_state    || null,
        postcode: m.shipping_postcode || null,
        country:  'AU',
      },
      items,
    }).select();

    if (error) {
      console.error('[stripe-webhook] INSERT FAILED:', error.code, error.message);
      return NextResponse.json({ error: 'Database insert failed', detail: error.message }, { status: 500 });
    }

    console.log('[stripe-webhook] Order saved:', JSON.stringify(data));
  }

  return NextResponse.json({ received: true });
}
