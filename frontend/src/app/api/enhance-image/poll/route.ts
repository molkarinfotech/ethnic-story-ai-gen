import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Each poll check is fast (<1s). Supabase upload only happens once on success.
export const maxDuration = 10;

const BUCKET = 'product-images';

export async function GET(req: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN!;
    const { searchParams } = new URL(req.url);
    const predictionId = searchParams.get('id');
    const productId    = searchParams.get('productId') ?? 'product';

    if (!predictionId) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Check prediction status
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const prediction = await res.json();

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return NextResponse.json(
        { error: `Replicate ${prediction.status}: ${prediction.error ?? 'unknown'}`, status: prediction.status },
        { status: 500 }
      );
    }

    if (prediction.status !== 'succeeded') {
      // Still processing — tell frontend to keep polling
      return NextResponse.json({ status: prediction.status });
    }

    // Succeeded — download and upload to Supabase
    const output = prediction.output;
    const enhancedUrl: string = Array.isArray(output) ? output[0] : output;

    const imgRes = await fetch(enhancedUrl);
    if (!imgRes.ok) throw new Error(`Could not download from Replicate: HTTP ${imgRes.status}`);
    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') ?? 'image/webp';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const storagePath = `${productId.replace(/[^a-z0-9-]/gi, '-')}-enhanced-${Date.now()}.${ext}`;

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });
    if (uploadErr) throw new Error(`Supabase upload: ${uploadErr.message}`);

    const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({ status: 'succeeded', url: data.publicUrl });

  } catch (e: any) {
    console.error('[enhance-image/poll]', e?.message);
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
