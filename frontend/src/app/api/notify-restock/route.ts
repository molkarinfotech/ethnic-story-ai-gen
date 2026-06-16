import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import { sendEmail, buildRestockSubscribedEmail } from '../../../lib/resend';

export const dynamic = 'force-dynamic';

// POST — subscribe an email to restock notification for a product
export async function POST(req: NextRequest) {
  const { email, productId, productName, productSlug } = await req.json();

  if (!email || !productId || !productName) {
    return NextResponse.json({ error: 'email, productId, productName required' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Upsert so duplicate submissions are idempotent
  const { error } = await sb.from('restock_notifications').upsert(
    { email, product_id: productId, product_name: productName, product_slug: productSlug ?? null, notified: false },
    { onConflict: 'email,product_id', ignoreDuplicates: true }
  );

  if (error) {
    console.error('[notify-restock] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send subscription confirmation email (fire-and-forget, don't fail request on email error)
  const emailPayload = buildRestockSubscribedEmail(productName, email);
  sendEmail(emailPayload).catch(err => console.error('[notify-restock] Confirmation email failed:', err));

  return NextResponse.json({ subscribed: true });
}
