import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../../lib/supabase';
import { isAdminAuthed } from '../../../../../lib/admin-auth';

// ── GET: return a single product with its variants ─────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceSupabase();

  const { data: product, error: prodErr } = await sb
    .from('products')
    .select('id, name, slug, category, price, original_price, badge, image, in_stock, stock_count, created_at')
    .eq('id', params.id)
    .single();

  if (prodErr || !product) {
    return NextResponse.json({ error: prodErr?.message ?? 'Not found' }, { status: 404 });
  }

  const { data: variants } = await sb
    .from('product_variants')
    .select('id, size, stock_count, price')
    .eq('product_id', params.id)
    .order('size', { ascending: true });

  return NextResponse.json({ ...product, variants: variants ?? [] });
}

// ── PATCH: update product fields ───────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('products').update(body).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE: remove product ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { error } = await sb.from('products').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
