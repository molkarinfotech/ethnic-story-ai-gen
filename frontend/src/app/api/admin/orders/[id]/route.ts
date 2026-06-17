import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../../lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function isAdminAuthed(): boolean {
  try {
    const store = cookies();
    return store.get('admin_session')?.value === (process.env.ADMIN_SECRET ?? 'ethnic-admin-secret');
  } catch { return false; }
}

// GET — fetch a single order (admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH — update order fulfillment fields (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();

  const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const allowed: Record<string, unknown> = {};

  // Support both 'status' (legacy) and 'fulfillment_status'
  const statusVal = body.fulfillment_status ?? body.status;
  if (statusVal !== undefined) {
    if (!VALID_STATUSES.includes(statusVal)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    allowed.fulfillment_status = statusVal;
    allowed.status             = statusVal; // keep both in sync
  }
  if (body.tracking_number  !== undefined) allowed.tracking_number  = body.tracking_number  || null;
  if (body.shipping_carrier !== undefined) allowed.shipping_carrier = body.shipping_carrier || null;
  if (body.notes            !== undefined) allowed.notes            = body.notes            || null;
  if (body.payment_method   !== undefined) allowed.payment_method   = body.payment_method   || null;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('orders')
    .update(allowed)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[admin/orders/[id] PATCH]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
