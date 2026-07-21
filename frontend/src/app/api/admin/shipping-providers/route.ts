import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('shipping_providers')
    .select('*')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, tracking_url_template } = body as { name?: string; tracking_url_template?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const { data, error } = await supabase
    .from('shipping_providers')
    .insert({ name: name.trim(), tracking_url_template: tracking_url_template?.trim() ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, tracking_url_template } = body as { id?: string; name?: string; tracking_url_template?: string };
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (tracking_url_template !== undefined) updates.tracking_url_template = tracking_url_template?.trim() ?? null;
  const { data, error } = await supabase
    .from('shipping_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { error } = await supabase.from('shipping_providers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
