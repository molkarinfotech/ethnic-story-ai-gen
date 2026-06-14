import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export type ProductImage = { id: string; colour: string; url: string; sort_order: number };

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_images')
    .select('id, colour, url, sort_order')
    .eq('product_id', params.productId)
    .order('colour')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}

// POST: add an image for a product+colour
export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  const { colour = '', url, sort_order = 0 } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_images')
    .insert({ product_id: params.productId, colour, url, sort_order })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: remove a single image by id (pass ?id=...)
export async function DELETE(req: NextRequest, { params: _p }: { params: { productId: string } }) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const sb = getServiceSupabase();
  const { error } = await sb.from('product_images').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
