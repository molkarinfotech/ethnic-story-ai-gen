import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── GET  /api/admin/notifications ──────────────────────────────────────────────
// Returns all restock notification requests joined with product name
export async function GET() {
  const { data, error } = await supabase
    .from('restock_notifications')
    .select(`
      id,
      email,
      product_id,
      variant_label,
      created_at,
      notified_at,
      products ( name )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notifications = (data ?? []).map((row: any) => ({
    id:            row.id,
    email:         row.email,
    product_id:    row.product_id,
    product_name:  row.products?.name ?? row.product_id,
    variant_label: row.variant_label ?? null,
    created_at:    row.created_at,
    notified_at:   row.notified_at ?? null,
  }));

  return NextResponse.json({ notifications });
}

// ── POST /api/admin/notifications ──────────────────────────────────────────────
// action: 'send_one'          — send a single notification by id
// action: 'send_all_pending'  — send all un-notified entries
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, id } = body;

  if (action === 'send_one') {
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: entry, error: fetchErr } = await supabase
      .from('restock_notifications')
      .select('id, email, product_id, variant_label, products(name)')
      .eq('id', id)
      .single();

    if (fetchErr || !entry)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await sendRestockEmail(entry);

    const { error: updateErr } = await supabase
      .from('restock_notifications')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'send_all_pending') {
    const { data: pending, error: fetchErr } = await supabase
      .from('restock_notifications')
      .select('id, email, product_id, variant_label, products(name)')
      .is('notified_at', null);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!pending?.length) return NextResponse.json({ sent: 0 });

    let sent = 0;
    for (const entry of pending) {
      try {
        await sendRestockEmail(entry);
        await supabase
          .from('restock_notifications')
          .update({ notified_at: new Date().toISOString() })
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
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('restock_notifications')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── Helper: send a single restock email via the existing notify-restock route ──
async function sendRestockEmail(entry: any) {
  const productName = entry.products?.name ?? entry.product_id;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ethnicstory.com.au';

  await fetch(`${baseUrl}/api/notify-restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email:        entry.email,
      product_id:   entry.product_id,
      product_name: productName,
      variant_label: entry.variant_label,
    }),
  });
}
