import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// ── GET  /api/admin/notifications ──────────────────────────────────────────────
// Returns all restock notification requests.
// Table schema: id, email, product_id, product_name, product_slug, notified (bool), created_at
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('restock_notifications')
    .select('id, email, product_id, product_name, product_slug, notified, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data ?? [] });
}

// ── POST /api/admin/notifications ──────────────────────────────────────────────
// action: 'send_one'          — send a single notification by id
// action: 'send_all_pending'  — send all un-notified entries
export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, id } = body;
  const sb = getServiceSupabase();

  if (action === 'send_one') {
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: entry, error: fetchErr } = await sb
      .from('restock_notifications')
      .select('id, email, product_id, product_name, product_slug')
      .eq('id', id)
      .single();

    if (fetchErr || !entry)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await sendRestockEmail(entry);

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
      .select('id, email, product_id, product_name, product_slug')
      .eq('notified', false);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!pending?.length) return NextResponse.json({ sent: 0 });

    let sent = 0;
    for (const entry of pending) {
      try {
        await sendRestockEmail(entry);
        await sb
          .from('restock_notifications')
          .update({ notified: true })
          .eq('id', entry.id);
        sent++;
      } catch { /* continue on individual failure */ }
    }
    return NextResponse.json({ sent });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// ── DELETE /api/admin/notifications ────────────────────────────────────────────
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

// ── Helper: trigger the existing restock confirmation email ────────────────────
async function sendRestockEmail(entry: { email: string; product_id: string; product_name: string; product_slug?: string | null }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ethnicstory.com.au';

  const res = await fetch(`${baseUrl}/api/notify-restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email:        entry.email,
      productId:    entry.product_id,
      productName:  entry.product_name,
      productSlug:  entry.product_slug ?? null,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`notify-restock failed: ${err}`);
  }
}
