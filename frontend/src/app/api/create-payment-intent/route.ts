import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

const MIN_AMOUNT_AUD = 0.5;
const MAX_AMOUNT_AUD = 10000;

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'aud', token: accessToken, discountAmount = 0, couponCode } = await req.json();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < MIN_AMOUNT_AUD) {
      return NextResponse.json({ error: `Amount must be at least $${MIN_AMOUNT_AUD} AUD` }, { status: 400 });
    }
    if (parsedAmount > MAX_AMOUNT_AUD) {
      return NextResponse.json({ error: `Amount exceeds the maximum allowed per transaction` }, { status: 400 });
    }

    let user_id: string | null = null;
    if (accessToken) {
      try {
        const sb = getServiceSupabase();
        const { data: { user } } = await sb.auth.getUser(accessToken);
        user_id = user?.id ?? null;
      } catch { /* guest */ }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parsedAmount * 100),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...(user_id    ? { user_id }                                 : {}),
        ...(couponCode ? { coupon_code: String(couponCode) }         : {}),
        ...(discountAmount > 0 ? { discount_amount: String(discountAmount) } : {}),
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
