import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

// Public endpoint — returns order details for any valid UUID.
// Sensitive fields (customer_email, customer_phone) are omitted
// so the page is safe to render without authentication.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('orders')
    .select('id, created_at, status, payment_method, amount_aud, shipping_cost, items, customer_name, shipping_address, tracking_number, shipping_carrier')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[api/orders/[id]] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
