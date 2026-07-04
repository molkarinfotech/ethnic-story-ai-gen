/**
 * Server-side proxy to download a Replicate-hosted image and save it.
 * Replicate CDN URLs are short-lived — we re-fetch server-side immediately
 * and fall back to accepting a raw base64 body when the URL has expired.
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
    image_url?:  string;
    image_b64?:  string;   // base64 PNG/JPG fallback when URL has expired
    product_id:  string;
    colour:      string;
    size?:       string;
    sort_order?: number;
  };

  const { image_url, image_b64, product_id, colour: colourRaw, size, sort_order = 1 } = body;

  if (!image_url && !image_b64)
    return NextResponse.json({ error: 'image_url or image_b64 required' }, { status: 400 });
  if (!product_id)
    return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const colour     = normaliseColour(colourRaw);
  const colourSlug = colour.replace(/\s+/g, '-').toLowerCase();

  // 1. Get image bytes — prefer URL fetch, fall back to base64
  let buffer: Buffer;
  let contentType = 'image/jpeg';

  if (image_b64) {
    // Client already decoded from an <img> src data-URI or sent raw base64
    const b64 = image_b64.replace(/^data:[^;]+;base64,/, '');
    buffer      = Buffer.from(b64, 'base64');
    contentType = image_b64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  } else {
    try {
      const imgRes = await fetch(image_url!, { signal: AbortSignal.timeout(15_000) });
      if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status} ${imgRes.statusText}`);
      contentType  = imgRes.headers.get('content-type') ?? 'image/jpeg';
      buffer       = Buffer.from(await imgRes.arrayBuffer());
    } catch (e: unknown) {
      return NextResponse.json(
        { error: `Could not fetch image: ${e instanceof Error ? e.message : 'fetch failed'}. Try saving again immediately after generating.` },
        { status: 500 },
      );
    }
  }

  // 2. Upload to Supabase Storage
  const ext         = contentType.includes('png') ? 'png' : 'jpg';
  const storagePath = `${product_id}/${colourSlug}/model-${Date.now()}.${ext}`;
  const sb          = getServiceSupabase();

  const { error: uploadErr } = await sb.storage
    .from('product-images')
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: urlData } = sb.storage.from('product-images').getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  // 3. Insert into product_images
  const { data: imgRow, error: insertErr } = await sb
    .from('product_images')
    .insert({ product_id, colour, url: publicUrl, sort_order })
    .select('id, colour, url, sort_order')
    .single();

  if (insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // 4. Optionally update product_variants.image_url for this colour+size
  if (size) {
    await sb
      .from('product_variants')
      .upsert(
        { product_id, size, colour, image_url: publicUrl, stock_count: 0 },
        { onConflict: 'product_id,size,colour' },
      );
  }

  return NextResponse.json({ ok: true, image: imgRow, url: publicUrl });
}
