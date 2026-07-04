/**
 * Server-side proxy to download a Replicate-hosted image and save it.
 * The browser cannot fetch Replicate CDN URLs directly (CORS), so the
 * scan page POSTs the image URL here and this route fetches it server-side,
 * then uploads to Supabase Storage via the same path as scan-upload.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';
import { normaliseColour } from '../scan-upload/route';

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return !!cookieStore.get('admin_session')?.value || !!cookieStore.get('admin_token')?.value;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    image_url:  string;
    product_id: string;
    colour:     string;
    size?:      string;
    sort_order?: number;
  };

  const { image_url, product_id, colour: colourRaw, size, sort_order = 1 } = body;

  if (!image_url)  return NextResponse.json({ error: 'image_url required' },  { status: 400 });
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const colour     = normaliseColour(colourRaw);
  const colourSlug = colour.replace(/\s+/g, '-').toLowerCase();

  // 1. Fetch image server-side (bypasses browser CORS)
  let buffer: Buffer;
  let contentType = 'image/jpeg';
  try {
    const imgRes = await fetch(image_url);
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status} ${imgRes.statusText}`);
    contentType  = imgRes.headers.get('content-type') ?? 'image/jpeg';
    const ab     = await imgRes.arrayBuffer();
    buffer       = Buffer.from(ab);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fetch failed' }, { status: 500 });
  }

  // 2. Upload to Supabase Storage
  const ext         = contentType.includes('png') ? 'png' : 'jpg';
  const storagePath = `${product_id}/${colourSlug}/model-${Date.now()}.${ext}`;
  const sb          = getServiceSupabase();

  const { error: uploadErr } = await sb.storage
    .from('product-images')
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from('product-images').getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  // 3. Insert into product_images
  const { data: imgRow, error: insertErr } = await sb
    .from('product_images')
    .insert({ product_id, colour, url: publicUrl, sort_order })
    .select('id, colour, url, sort_order')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // 4. Optionally update product_variants.image_url for this colour+size
  if (size) {
    await sb
      .from('product_variants')
      .upsert(
        { product_id, size, colour, image_url: publicUrl, stock_count: 0 },
        { onConflict: 'product_id,size,colour' }
      );
  }

  return NextResponse.json({ ok: true, image: imgRow, url: publicUrl });
}
