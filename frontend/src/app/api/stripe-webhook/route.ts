import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Invalid signature:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const m  = pi.metadata ?? {};

    let items: object[] = [];
    try { items = JSON.parse(m.items ?? '[]'); } catch {}

    const sb = getServiceSupabase();
    const { error } = await sb.from('orders').insert({
      stripe_payment_intent_id: pi.id,
      amount_aud:   pi.amount / 100,
      status:       'paid',
      customer_name:  m.customer_name  || null,
      customer_email: m.customer_email || null,
      customer_phone: m.customer_phone || null,
      shipping_address: {
        line1:    m.shipping_line1,
        line2:    m.shipping_line2,
        suburb:   m.shipping_suburb,
        state:    m.shipping_state,
        postcode: m.shipping_postcode,
        country:  'AU',
      },
      items,
    });

    if (error) {
      console.error('[stripe-webhook] Supabase insert failed:', error.message);
      // Return 200 so Stripe doesn’t retry — log and investigate manually
    } else {
      console.log('[stripe-webhook] Order saved:', pi.id);
    }
  }

  return NextResponse.json({ received: true });
}
