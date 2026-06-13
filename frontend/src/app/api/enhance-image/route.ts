import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const BUCKET = 'product-images';

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      HUGGINGFACE_API_TOKEN:    !!process.env.HUGGINGFACE_API_TOKEN    ? '✅ set' : '❌ MISSING',
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL  ? '✅ set' : '❌ MISSING',
      SUPABASE_SERVICE_ROLE_KEY:!!process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '❌ MISSING',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    if (!hfToken) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_TOKEN not set' }, { status: 500 });
    }

    const { imageUrl, productId } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

    // 1. Fetch original image as bytes
    const srcRes = await fetch(imageUrl);
    if (!srcRes.ok) throw new Error(`Could not fetch source image (${srcRes.status})`);
    const srcBuffer = await srcRes.arrayBuffer();

    // 2. Send to HuggingFace Real-ESRGAN (returns enhanced image bytes directly)
    // Retries once in case of model cold-start (503)
    let hfRes = await fetch(
      'https://api-inference.huggingface.co/models/ai-forever/Real-ESRGAN',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: srcBuffer,
      }
    );

    // Cold-start: model loading — wait 20s and retry once
    if (hfRes.status === 503) {
      await new Promise(r => setTimeout(r, 20000));
      hfRes = await fetch(
        'https://api-inference.huggingface.co/models/ai-forever/Real-ESRGAN',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/octet-stream',
          },
          body: srcBuffer,
        }
      );
    }

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      throw new Error(`HuggingFace error (${hfRes.status}): ${errText}`);
    }

    // 3. Get enhanced image bytes
    const enhancedBuffer = await hfRes.arrayBuffer();
    const contentType = hfRes.headers.get('content-type') ?? 'image/png';
    const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') ? 'jpg' : 'png';
    const storagePath = `${(productId ?? 'product').replace(/[^a-z0-9-]/gi, '-')}-enhanced-${Date.now()}.${ext}`;

    // 4. Upload to Supabase Storage
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, enhancedBuffer, { contentType, upsert: true });
    if (uploadErr) throw new Error(`Supabase upload: ${uploadErr.message}`);

    const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({ url: data.publicUrl });

  } catch (e: any) {
    console.error('[enhance-image]', e?.message);
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
