import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const BUCKET = 'product-images';
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // 2 minutes max

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role for server-side upload
);

async function pollUntilDone(predictionId: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const json = await res.json();
    if (json.status === 'succeeded') {
      const output = json.output;
      return Array.isArray(output) ? output[0] : output;
    }
    if (json.status === 'failed' || json.status === 'canceled') {
      throw new Error(`Replicate prediction ${json.status}: ${json.error ?? ''}`);
    }
  }
  throw new Error('Enhancement timed out after 2 minutes.');
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, productId } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    if (!REPLICATE_API_TOKEN) return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });

    // 1. Start Replicate prediction using clarity-upscaler
    const startRes = await fetch('https://api.replicate.com/v1/models/philz1337x/clarity-upscaler/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait', // ask Replicate to hold connection up to 60s
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          scale_factor: 2,
          sharpen: 1.5,
          resemblance: 0.85,
          creativity: 0.35,
          prompt: 'indian ethnic fashion garment, high detail, studio lighting, white background',
          negative_prompt: 'blur, noise, watermark, text, logo',
          num_inference_steps: 18,
          guidance_scale: 7,
        },
      }),
    });

    const prediction = await startRes.json();
    if (!startRes.ok) throw new Error(prediction.detail ?? 'Failed to start enhancement');

    // 2. If not done yet, poll
    let enhancedUrl: string;
    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      enhancedUrl = Array.isArray(output) ? output[0] : output;
    } else {
      enhancedUrl = await pollUntilDone(prediction.id);
    }

    // 3. Download enhanced image and re-upload to Supabase Storage
    const imgRes = await fetch(enhancedUrl);
    if (!imgRes.ok) throw new Error('Could not download enhanced image from Replicate');
    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') ?? 'image/webp';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const storagePath = `${productId ?? 'product'}-enhanced-${Date.now()}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });
    if (uploadErr) throw uploadErr;

    const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({ url: data.publicUrl });

  } catch (e: any) {
    console.error('[enhance-image]', e);
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status: 500 });
  }
}
