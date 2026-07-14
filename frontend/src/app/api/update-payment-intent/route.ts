import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, metadata, token: accessToken, amount, couponCode, discountAmount } = await req.json();
    if (!paymentIntentId) return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });

    let user_id: string | null = null;
    if (accessToken) {
      try {
        const sb = getServiceSupabase();
        const { data: { user } } = await sb.auth.getUser(accessToken);
        user_id = user?.id ?? null;
      } catch { /* guest */ }
    }

    const updatePayload: Stripe.PaymentIntentUpdateParams = {
      metadata: {
        ...metadata,
        ...(user_id       ? { user_id }                                  : {}),
        ...(couponCode    ? { coupon_code: String(couponCode) }          : {}),
        ...(discountAmount > 0 ? { discount_amount: String(discountAmount) } : {}),
      },
    };

    // Update amount if provided (coupon applied after intent created)
    if (amount && Number(amount) >= 0.5) {
      updatePayload.amount = Math.round(Number(amount) * 100);
    }

    await stripe.paymentIntents.update(paymentIntentId, updatePayload);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[update-payment-intent]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
