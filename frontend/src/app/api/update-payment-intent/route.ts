import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, metadata } = await req.json();
    if (!paymentIntentId) return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });

    // Read user_id server-side
    let user_id: string | null = null;
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      user_id = user?.id ?? null;
    } catch { /* guest */ }

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...metadata,
        ...(user_id ? { user_id } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[update-payment-intent]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
