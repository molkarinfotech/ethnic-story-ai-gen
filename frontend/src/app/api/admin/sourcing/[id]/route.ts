import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, buildSourcingStatusEmail } from '../../../../../lib/resend';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = serviceClient();
  const body = await req.json();
  const { data, error } = await sb
    .from('sourcing_requests')
    .update({ status: body.status })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/sourcing/[id]  body: { action: 'notify' }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = serviceClient();
  const body = await req.json();

  if (body.action !== 'notify') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await sb
    .from('sourcing_requests')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const emailResult = await sendEmail(buildSourcingStatusEmail({
    customerEmail: row.email,
    customerName:  row.name ?? undefined,
    description:   row.description,
    status:        row.status,
  }));

  if (!emailResult.ok) {
    return NextResponse.json({ error: `Email failed: ${emailResult.error}` }, { status: 500 });
  }

  const { data: updated, error: updateErr } = await sb
    .from('sourcing_requests')
    .update({ status: 'notified' })
    .eq('id', params.id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = serviceClient();
  const { error } = await sb
    .from('sourcing_requests')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
