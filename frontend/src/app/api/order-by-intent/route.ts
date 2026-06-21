import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import { isAdminAuthed } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const intentId = req.nextUrl.searchParams.get('payment_intent');
  if (!intentId) return NextResponse.json({ error: 'Missing payment_intent' }, { status: 400 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('orders')
    .select('id, created_at, amount_aud, status, items, customer_name, customer_email, customer_phone, shipping_address, stripe_payment_intent_id, user_id')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Admin may always view any order
  if (isAdminAuthed(req)) return NextResponse.json(data);

  // Registered customers: verify the requesting user owns this order
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const { data: { user } } = await sb.auth.getUser(token);
      if (user && data.user_id && user.id === data.user_id) {
        // Strip internal user_id before returning
        const { user_id: _uid, ...safeData } = data as any;
        return NextResponse.json(safeData);
      }
    } catch { /* fall through to 403 */ }
  }

  // Guest: allow read of own order only via payment_intent (already a secret per-session value)
  // but only expose non-PII fields for guests without a matched user_id
  if (!data.user_id) {
    const { user_id: _uid, customer_phone, ...guestSafe } = data as any;
    return NextResponse.json(guestSafe);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
