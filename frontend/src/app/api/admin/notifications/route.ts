import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';
import { sendEmail, buildRestockEmail } from '../../../../lib/resend';

export const dynamic = 'force-dynamic';

// notify_type added so the admin panel can filter restock vs coming_soon
const COLS = 'id, email, product_id, product_name, product_slug, variant_id, size, colour, notified, notify_type, created_at';

// GET /api/admin/notifications
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('restock_notifications')
    .select(COLS)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

// POST /api/admin/notifications
export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, id } = body;
  const sb = getServiceSupabase();

  if (action === 'send_one') {
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: entry, error: fetchErr } = await sb
      .from('restock_notifications')
      .select(COLS)
      .eq('id', id)
      .single();

    if (fetchErr || !entry)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const emailResult = await sendRestockEmail(entry);
    if (!emailResult.ok) {
      return NextResponse.json({ error: `Email failed: ${emailResult.error}` }, { status: 500 });
    }

    const { error: updateErr } = await sb
      .from('restock_notifications')
      .update({ notified: true })
      .eq('id', id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'send_all_pending') {
    const { data: pending, error: fetchErr } = await sb
      .from('restock_notifications')
      .select(COLS)
      .eq('notified', false);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!pending?.length) return NextResponse.json({ sent: 0 });

    let sent = 0;
    for (const entry of pending) {
      try {
        const result = await sendRestockEmail(entry);
        if (result.ok) {
          await sb
            .from('restock_notifications')
            .update({ notified: true })
            .eq('id', entry.id);
          sent++;
        } else {
          console.error(`[admin/notifications] Email failed for ${entry.email}:`, result.error);
        }
      } catch (err) {
        console.error(`[admin/notifications] Unexpected error for ${entry.email}:`, err);
      }
    }
    return NextResponse.json({ sent });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// DELETE /api/admin/notifications
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sb = getServiceSupabase();
  const { error } = await sb
    .from('restock_notifications')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Helper: send the actual "back in stock" email directly via Resend
async function sendRestockEmail(entry: {
  email: string;
  product_name: string;
  product_slug?: string | null;
  size?: string | null;
  colour?: string | null;
}) {
  const variantLabel = [entry.colour, entry.size].filter(Boolean).join(' / ');
  const displayName  = variantLabel ? `${entry.product_name} (${variantLabel})` : entry.product_name;

  return sendEmail(buildRestockEmail({
    customerEmail: entry.email,
    productName:   displayName,
    productSlug:   entry.product_slug ?? '',
  }));
}
