import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export type ProductImage = { id: string; colour: string; url: string; sort_order: number };

// Bug fix: await params — required in Next.js 15 (params is now a Promise)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_images')
    .select('id, colour, url, sort_order')
    .eq('product_id', productId)
    .order('colour')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}

// POST: add an image for a product+colour
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const { colour = '', url, sort_order = 0 } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_images')
    .insert({ product_id: productId, colour, url, sort_order })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH: update sort_order, url, and/or colour on an existing image row
export async function PATCH(
  req: NextRequest,
  { params: _p }: { params: Promise<{ productId: string }> }
) {
  const body = await req.json();
  const { id, sort_order, url, colour } = body as {
    id?: string;
    sort_order?: number;
    url?: string;
    colour?: string;
  };

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (sort_order !== undefined) update.sort_order = sort_order;
  if (url       !== undefined) update.url        = url;
  if (colour    !== undefined) update.colour     = colour;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_images')
    .update(update)
    .eq('id', id)
    .select('id, colour, url, sort_order')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: remove a single image by id (pass ?id=...)
export async function DELETE(
  req: NextRequest,
  { params: _p }: { params: Promise<{ productId: string }> }
) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const sb = getServiceSupabase();
  const { error } = await sb.from('product_images').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
