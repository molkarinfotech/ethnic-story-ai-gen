import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, buildOrderConfirmationEmail, OrderEmailData } from '../../../lib/resend';

export const dynamic = 'force-dynamic';

// Internal route — called server-side from the stripe-webhook handler.
// Not exposed publicly; no auth needed beyond same-origin server calls.
export async function POST(req: NextRequest) {
  const data: OrderEmailData = await req.json();

  if (!data.customerEmail) {
    return NextResponse.json({ error: 'customerEmail required' }, { status: 400 });
  }

  const payload = buildOrderConfirmationEmail(data);
  const result  = await sendEmail(payload);

  if (!result.ok) {
    console.error('[send-order-confirmation] Failed:', result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  console.log('[send-order-confirmation] Sent to', data.customerEmail);
  return NextResponse.json({ sent: true });
}
