import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import { sendEmail, buildOrderConfirmationEmail } from '../../../lib/resend';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['cash', 'eftpos', 'payid'] as const;
type ManualMethod = typeof ALLOWED_METHODS[number];

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

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
    notes,
  } = body;

  // ── Validate inputs ──────────────────────────────────────────────────────────────
  if (!ALLOWED_METHODS.includes(payment_method)) {
    return NextResponse.json(
      { error: `payment_method must be one of: ${ALLOWED_METHODS.join(', ')}` },
      { status: 400 },
    );
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

  // ── Pre-flight stock check ────────────────────────────────────────────────────────
  // Resolve each item to its variant (or product) and check available stock
  // BEFORE writing anything, so we never partially-deplete then fail.
  type ResolvedItem = {
    item: typeof items[number];
    qty: number;
    variantId: string | null;
    currentStock: number;
    label: string;
  };
  const resolved: ResolvedItem[] = [];

  for (const item of items) {
    if (!item.id || !item.quantity || item.quantity < 1) continue;
    const qty = Number(item.quantity);

    // Build variant lookup — match on size AND colour if both provided
    let variantQuery = sb
      .from('product_variants')
      .select('id, size, colour, stock_count')
      .eq('product_id', item.id);
    if (item.size)   variantQuery = variantQuery.eq('size', item.size);
    if (item.colour) variantQuery = variantQuery.eq('colour', item.colour);

    const { data: variants } = await variantQuery;

    if (variants && variants.length > 0) {
      const v = variants[0];
      const stock = v.stock_count ?? 0;
      const label = [item.name, v.size, v.colour].filter(Boolean).join(' / ');
      if (stock < qty) {
        return NextResponse.json(
          { error: `“${label}” only has ${stock} in stock (requested ${qty}).` },
          { status: 409 },
        );
      }
      resolved.push({ item, qty, variantId: v.id, currentStock: stock, label });
    } else {
      // Fallback: product-level stock_count
      const { data: prod } = await sb
        .from('products')
        .select('id, name, stock_count')
        .eq('id', item.id)
        .maybeSingle();
      const stock = (prod as any)?.stock_count ?? 0;
      const label = item.name ?? item.id;
      if (stock < qty) {
        return NextResponse.json(
          { error: `“${label}” only has ${stock} in stock (requested ${qty}).` },
          { status: 409 },
        );
      }
      resolved.push({ item, qty, variantId: null, currentStock: stock, label });
    }
  }

  // ── Insert order ──────────────────────────────────────────────────────────────────────
  const manualPiId = `manual_${genId()}`;

  const { data: orderData, error: insertError } = await sb
    .from('orders')
    .insert({
      stripe_payment_intent_id: manualPiId,
      payment_method,
      status:         'pending',
      amount_aud:     Number(amount_aud),
      shipping_cost:  Number(shipping_cost),
      items,
      user_id:        user_id        || null,
      customer_name:  customer_name  || null,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      notes:          notes          || null,
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

  // ── Deplete stock (all pre-validated above) ────────────────────────────────────────
  for (const { item, qty, variantId, currentStock } of resolved) {
    const newStock = Math.max(0, currentStock - qty);
    if (variantId) {
      const { error: varErr } = await sb
        .from('product_variants')
        .update({ stock_count: newStock })
        .eq('id', variantId);
      if (varErr) console.error('[create-manual-order] variant stock update failed:', varErr.message);
    } else {
      const { error: prodErr } = await sb
        .from('products')
        .update({ stock_count: newStock })
        .eq('id', item.id);
      if (prodErr) console.error('[create-manual-order] product stock update failed:', prodErr.message);
    }
  }

  // ── Send confirmation email ─────────────────────────────────────────────────────────
  const itemsTotal = items.reduce(
    (s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity,
    0,
  );
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
