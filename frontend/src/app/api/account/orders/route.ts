import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ORDER_SELECT = [
  'id', 'created_at', 'amount_aud', 'status', 'fulfillment_status',
  'items', 'customer_name', 'customer_email', 'customer_phone',
  'shipping_address', 'stripe_payment_intent_id',
  'tracking_number', 'shipping_carrier', 'notes',
  'coupon_code', 'discount_amount', 'shipping_cost',
].join(', ');

// Explicit type so TypeScript doesn't infer GenericStringError union
interface OrderRow {
  id: string;
  created_at: string;
  amount_aud: number;
  status: string;
  fulfillment_status?: string | null;
  items: unknown;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_address?: unknown | null;
  stripe_payment_intent_id?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  notes?: string | null;
  coupon_code?: string | null;
  discount_amount?: number | null;
  shipping_cost?: number | null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // 1. Orders directly linked by user_id
  const { data: byIdRaw } = await sb
    .from('orders')
    .select(ORDER_SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // 2. Orders with no user_id but matching auth email (guest / pre-stamp legacy)
  const { data: byEmailRaw } = await sb
    .from('orders')
    .select(ORDER_SELECT)
    .is('user_id', null)
    .ilike('customer_email', user.email ?? '')
    .order('created_at', { ascending: false });

  // Cast to typed arrays — Supabase returns GenericStringError union without explicit types
  const byId    = (byIdRaw    ?? []) as OrderRow[];
  const byEmail = (byEmailRaw ?? []) as OrderRow[];

  // 3. Merge + deduplicate
  const seen = new Set<string>();
  const orders = [...byId, ...byEmail].filter(o => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  // 4. Back-fill user_id on legacy email-matched orders (fire-and-forget)
  const legacyIds = byEmail.map(o => o.id);
  if (legacyIds.length > 0) {
    sb.from('orders').update({ user_id: user.id }).in('id', legacyIds).then(() => {});
  }

  return NextResponse.json(orders, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
