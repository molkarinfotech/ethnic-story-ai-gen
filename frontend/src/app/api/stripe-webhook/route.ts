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

    let items: { id: string; name: string; quantity: number; price: number; size?: string }[] = [];
    try { items = JSON.parse(m.items ?? '[]'); } catch { items = []; }

    console.log('[stripe-webhook] Items from metadata:', JSON.stringify(items));

    const sb = getServiceSupabase();

    // ── 1. Save order ──────────────────────────────────────────────────────────
    const { error: insertError, data: orderData } = await sb.from('orders').insert({
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

    if (insertError) {
      console.error('[stripe-webhook] INSERT FAILED:', insertError.code, insertError.message);
      return NextResponse.json({ error: 'Database insert failed', detail: insertError.message }, { status: 500 });
    }

    const orderId = orderData?.[0]?.id ?? pi.id;
    console.log('[stripe-webhook] Order saved. user_id:', m.user_id || 'guest', '| row:', orderId);

    // ── 2. Decrement stock per variant (product_id + size) ─────────────────────
    for (const item of items) {
      if (!item.id || !item.quantity) continue;

      let variantQuery = sb
        .from('product_variants')
        .select('id, stock_count')
        .eq('product_id', item.id);

      if (item.size) {
        variantQuery = variantQuery.eq('size', item.size);
      }

      const { data: variant, error: fetchErr } = await variantQuery.maybeSingle();

      if (fetchErr) {
        console.error(`[stripe-webhook] Variant fetch error for ${item.id}/${item.size ?? 'no-size'}:`, fetchErr.message);
        continue;
      }

      if (!variant) {
        console.warn(`[stripe-webhook] No variant found: product_id=${item.id} size=${item.size ?? 'none'} — skipping stock deduct`);
        continue;
      }

      const newStock = Math.max(0, (variant.stock_count ?? 0) - item.quantity);

      const { error: updateErr } = await sb
        .from('product_variants')
        .update({ stock_count: newStock })
        .eq('id', variant.id);

      if (updateErr) {
        console.error(`[stripe-webhook] Stock update error for variant ${variant.id}:`, updateErr.message);
      } else {
        console.log(`[stripe-webhook] ✓ Stock: product=${item.id} size=${item.size ?? 'N/A'} | ${variant.stock_count} → ${newStock}`);
      }
    }

    // ── 3. Send order confirmation email ──────────────────────────────────────
    if (m.customer_email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        await fetch(`${baseUrl}/api/send-order-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName:    m.customer_name  || 'Valued Customer',
            customerEmail:   m.customer_email,
            orderId,
            items,
            totalAud:        pi.amount / 100,
            shippingAddress: {
              line1:    m.shipping_line1    || null,
              line2:    m.shipping_line2    || null,
              suburb:   m.shipping_suburb   || null,
              state:    m.shipping_state    || null,
              postcode: m.shipping_postcode || null,
            },
          }),
        });
        console.log('[stripe-webhook] Order confirmation email dispatched to', m.customer_email);
      } catch (emailErr) {
        // Don't fail the webhook if email fails
        console.error('[stripe-webhook] Email dispatch error:', emailErr);
      }
    } else {
      console.warn('[stripe-webhook] No customer_email in metadata — skipping confirmation email');
    }
  }

  return NextResponse.json({ received: true });
}
