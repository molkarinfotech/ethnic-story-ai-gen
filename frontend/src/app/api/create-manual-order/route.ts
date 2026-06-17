import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import { sendEmail, buildOrderConfirmationEmail } from '../../../lib/resend';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['cash', 'eftpos', 'payid'] as const;
type ManualMethod = typeof ALLOWED_METHODS[number];

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    payment_method,
    items,
    customer_name,
    customer_email,
    customer_phone,
    shipping_line1,
    shipping_line2,
    shipping_suburb,
    shipping_state,
    shipping_postcode,
    amount_aud,
    shipping_cost = 0,
    user_id,
  } = body;

  // ── Validate ────────────────────────────────────────────────────────────────────
  if (!ALLOWED_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: `payment_method must be one of: ${ALLOWED_METHODS.join(', ')}` }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }
  if (!customer_email) {
    return NextResponse.json({ error: 'customer_email is required' }, { status: 400 });
  }
  if (!amount_aud || isNaN(Number(amount_aud))) {
    return NextResponse.json({ error: 'amount_aud is required and must be a number' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // ── Insert order ───────────────────────────────────────────────────────────────────
  const { data: orderData, error: insertError } = await sb
    .from('orders')
    .insert({
      payment_method,
      status:         'pending',          // awaiting cash / eftpos / payid
      amount_aud:     Number(amount_aud),
      shipping_cost:  Number(shipping_cost),
      items,
      user_id:        user_id || null,
      customer_name:  customer_name  || null,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      shipping_address: {
        line1:    shipping_line1    || null,
        line2:    shipping_line2    || null,
        suburb:   shipping_suburb   || null,
        state:    shipping_state    || null,
        postcode: shipping_postcode || null,
        country:  'AU',
      },
    })
    .select()
    .single();

  if (insertError) {
    console.error('[create-manual-order] INSERT failed:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const orderId = orderData.id;

  // ── Decrement stock ──────────────────────────────────────────────────────────────────
  for (const item of items) {
    if (!item.id || !item.quantity) continue;
    let q = sb.from('product_variants').select('id, stock_count').eq('product_id', item.id);
    if (item.size) q = q.eq('size', item.size);
    const { data: variant } = await q.maybeSingle();
    if (variant) {
      const newStock = Math.max(0, (variant.stock_count ?? 0) - item.quantity);
      await sb.from('product_variants').update({ stock_count: newStock }).eq('id', variant.id);
    }
  }

  // ── Send confirmation email ──────────────────────────────────────────────────────────
  const itemsTotal = items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
  try {
    const emailPayload = buildOrderConfirmationEmail({
      customerName:    customer_name || 'Valued Customer',
      customerEmail:   customer_email,
      orderId,
      items,
      subtotalAud:     itemsTotal,
      shippingCost:    Number(shipping_cost),
      totalAud:        Number(amount_aud),
      paymentMethod:   payment_method as ManualMethod,
      shippingAddress: {
        line1:    shipping_line1    || undefined,
        line2:    shipping_line2    || undefined,
        suburb:   shipping_suburb   || undefined,
        state:    shipping_state    || undefined,
        postcode: shipping_postcode || undefined,
      },
    });
    const result = await sendEmail(emailPayload);
    if (!result.ok) console.error('[create-manual-order] Email failed:', result.error);
  } catch (e) {
    console.error('[create-manual-order] Email dispatch error:', e);
  }

  return NextResponse.json({ orderId, status: 'pending', payment_method });
}
