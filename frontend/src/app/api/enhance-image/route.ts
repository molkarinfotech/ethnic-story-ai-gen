import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 10;

// Community model — must use versioned endpoint with explicit version ID
const CLARITY_VERSION = 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e';

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

export async function POST(req: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return NextResponse.json({ error: 'REPLICATE_API_TOKEN not set' }, { status: 500 });

    const { imageUrl, productId } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: CLARITY_VERSION,
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
    });

    const prediction = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Replicate error (${res.status})`, detail: prediction },
        { status: 500 }
      );
    }

    return NextResponse.json({ predictionId: prediction.id, status: prediction.status });

  } catch (e: any) {
    console.error('[enhance-image]', e?.message);
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
