import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature') ?? '';

  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: 'No body' }, { status: 400 });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const rawBody = Buffer.concat(chunks.map(c => Buffer.from(c)));

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[stripe-webhook] Event:', event.type, event.id);

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const m  = pi.metadata ?? {};

    let items: object[] = [];
    try { items = JSON.parse(m.items ?? '[]'); } catch { items = []; }

    const sb = getServiceSupabase();

    const { error, data } = await sb.from('orders').insert({
      stripe_payment_intent_id: pi.id,
      amount_aud:               pi.amount / 100,
      status:                   'paid',
      user_id:                  m.user_id || null,
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

    console.log('[stripe-webhook] Order saved. user_id:', m.user_id || 'guest', '| row:', data?.[0]?.id);
  }

  return NextResponse.json({ received: true });
}
