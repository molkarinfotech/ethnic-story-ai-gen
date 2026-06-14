import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

const missingVars: string[] = [];
if (!process.env.STRIPE_SECRET_KEY)        missingVars.push('STRIPE_SECRET_KEY');
if (!process.env.STRIPE_WEBHOOK_SECRET)    missingVars.push('STRIPE_WEBHOOK_SECRET');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY)
  missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL)
  missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
if (missingVars.length) {
  console.error('[stripe-webhook] MISSING ENV VARS:', missingVars.join(', '));
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

// Debug: log first 20 chars so we can confirm which secret is loaded
console.log('[stripe-webhook] Secret loaded:', webhookSecret ? webhookSecret.slice(0, 20) + '…' : 'NOT SET');

export async function POST(req: NextRequest) {
  const buf = await req.arrayBuffer();
  const body = Buffer.from(buf).toString('utf8');
  const sig  = req.headers.get('stripe-signature') ?? '';

  console.log('[stripe-webhook] Incoming POST | sig present:', !!sig | 0, '| secret present:', !!webhookSecret | 0);
  console.log('[stripe-webhook] Using secret:', webhookSecret.slice(0, 20) + '…');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature validation failed:', err.message);
    console.error('[stripe-webhook] Secret used (first 20):', webhookSecret.slice(0, 20));
    console.error('[stripe-webhook] Sig header (first 60):', sig.slice(0, 60));
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[stripe-webhook] Received event:', event.type, event.id);

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const m  = pi.metadata ?? {};

    console.log('[stripe-webhook] PaymentIntent:', pi.id, '| amount:', pi.amount, '| metadata keys:', Object.keys(m).join(', '));

    let items: object[] = [];
    try { items = JSON.parse(m.items ?? '[]'); } catch { items = []; }

    const sb = getServiceSupabase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'MISSING';
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'MISSING';
    console.log('[stripe-webhook] Supabase URL:', supabaseUrl.slice(0, 40));
    console.log('[stripe-webhook] Service key set:', serviceKey !== 'MISSING' ? 'YES (' + serviceKey.slice(0, 10) + '\u2026)' : 'NO \u2014 INSERT WILL FAIL');

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
      console.error('[stripe-webhook] Supabase INSERT FAILED');
      console.error('  code:    ', error.code);
      console.error('  message: ', error.message);
      console.error('  details: ', error.details);
      console.error('  hint:    ', error.hint);
      return NextResponse.json(
        { error: 'Database insert failed', detail: error.message },
        { status: 500 }
      );
    }

    console.log('[stripe-webhook] \u2705 Order saved successfully. Row:', JSON.stringify(data));
  }

  return NextResponse.json({ received: true });
}
