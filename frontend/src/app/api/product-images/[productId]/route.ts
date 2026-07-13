import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export type ProductImage = { id: string; colour: string; url: string; sort_order: number };

/** Derive the Supabase Storage path from a public URL.
 *  URLs look like: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *  We need to return { bucket, path } so we can call storage.from(bucket).remove([path]).
 */
function storagePathFromUrl(url: string): { bucket: string; storagePath: string } | null {
  try {
    const u = new URL(url);
    // pathname: /storage/v1/object/public/<bucket>/<...path>
    const match = u.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], storagePath: match[2] };
  } catch {
    return null;
  }
}

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

// DELETE: remove a single image by id (pass ?id=...) — also deletes the file from Storage
export async function DELETE(
  req: NextRequest,
  { params: _p }: { params: Promise<{ productId: string }> }
) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const sb = getServiceSupabase();

  // 1. Fetch the row first so we have the storage URL before deleting
  const { data: row, error: fetchErr } = await sb
    .from('product_images')
    .select('url')
    .eq('id', id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: fetchErr?.message ?? 'Not found' }, { status: 404 });
  }

  // 2. Delete the DB row
  const { error: dbErr } = await sb.from('product_images').delete().eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // 3. Delete the file from Supabase Storage (best-effort — don't fail the request if this errors)
  const loc = storagePathFromUrl(row.url);
  if (loc) {
    const { error: storageErr } = await sb.storage
      .from(loc.bucket)
      .remove([loc.storagePath]);
    if (storageErr) {
      console.warn('[product-images DELETE] storage removal failed:', storageErr.message);
    }
  }

  return NextResponse.json({ ok: true });
}
