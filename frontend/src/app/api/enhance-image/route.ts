import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const BUCKET = 'product-images';
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 14;

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      REPLICATE_API_TOKEN:      !!process.env.REPLICATE_API_TOKEN      ? '✅ set' : '❌ MISSING',
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL  ? '✅ set' : '❌ MISSING',
      SUPABASE_SERVICE_ROLE_KEY:!!process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '❌ MISSING',
    },
  });
}

async function pollUntilDone(predictionId: string, token: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.status === 'succeeded') {
      const output = json.output;
      return Array.isArray(output) ? output[0] : output;
    }
    if (json.status === 'failed' || json.status === 'canceled') {
      throw new Error(`Replicate ${json.status}: ${json.error ?? 'unknown reason'}`);
    }
  }
  throw new Error('Enhancement timed out — the model is busy, please try again.');
}

export async function POST(req: NextRequest) {
  let step = 'parse';
  try {
    // 1. Parse
    const { imageUrl, productId } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    const token = process.env.REPLICATE_API_TOKEN!;

    // 2. Submit to Replicate
    step = 'replicate-submit';
    const startRes = await fetch(
      'https://api.replicate.com/v1/models/philz1337x/clarity-upscaler/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            image: imageUrl,
            scale_factor: 2,
            sharpen: 1.5,
            resemblance: 0.85,
            creativity: 0.35,
            prompt: 'indian ethnic fashion garment, high detail, studio lighting, clean background',
            negative_prompt: 'blur, noise, watermark, text, logo',
            num_inference_steps: 18,
            guidance_scale: 7,
          },
        }),
      }
    );

    const prediction = await startRes.json();
    if (!startRes.ok) {
      // Return raw Replicate error so we can see exactly what it says
      return NextResponse.json({
        error: `Replicate rejected the request (HTTP ${startRes.status})`,
        detail: prediction,
      }, { status: 500 });
    }

    // 3. Poll
    step = 'replicate-poll';
    let enhancedUrl: string;
    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      enhancedUrl = Array.isArray(output) ? output[0] : output;
    } else {
      enhancedUrl = await pollUntilDone(prediction.id, token);
    }

    // 4. Download result
    step = 'download';
    const imgRes = await fetch(enhancedUrl);
    if (!imgRes.ok) throw new Error(`Could not download from Replicate: HTTP ${imgRes.status} — ${enhancedUrl}`);
    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') ?? 'image/webp';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const storagePath = `${(productId ?? 'product').replace(/[^a-z0-9-]/gi, '-')}-enhanced-${Date.now()}.${ext}`;

    // 5. Upload to Supabase
    step = 'supabase-upload';
    const sb = getSb();
    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });
    if (uploadErr) throw new Error(`Supabase upload failed: ${uploadErr.message}`);

    const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({ url: data.publicUrl });

  } catch (e: any) {
    console.error(`[enhance-image] FAILED at step=${step}:`, e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? 'Unknown error', step },
      { status: 500 }
    );
  }
}
