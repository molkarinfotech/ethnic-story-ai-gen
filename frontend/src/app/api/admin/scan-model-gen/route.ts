import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return !!cookieStore.get('admin_session')?.value;
  } catch {
    return false;
  }
}

// Build a rich fashion-photography prompt from available metadata
function buildPrompt(style: string, description: string): string {
  const base = `High-quality professional fashion photograph of a South Asian female model wearing a ${description}. `;

  const styles: Record<string, string> = {
    studio:
      'Clean white studio background, soft diffused lighting from both sides, full-body shot, ' +
      'model standing in a natural relaxed pose, luxury e-commerce product photography, ' +
      'sharp focus on the garment showing all embroidery and fabric details, 4K quality.',
    outdoor:
      'Beautiful outdoor setting with soft natural daylight, lush garden or Indian heritage ' +
      'palace architecture softly blurred in background, editorial fashion photography, ' +
      'golden hour lighting, full-body shot, sharp focus on the garment.',
    editorial:
      'Dramatic high-fashion studio lighting with deep shadows, minimalist dark gradient background, ' +
      'Vogue India editorial style, professional model pose, luxury fashion magazine aesthetic, ' +
      'cinematic colour grading, sharp focus on every garment detail.',
  };

  return base + (styles[style] ?? styles.studio);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const formData    = await req.formData();
    const modelStyle  = (formData.get('style')       as string | null) ?? 'studio';
    const garmentDesc = (formData.get('description') as string | null) ?? 'ethnic Indian garment';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured on this server' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const prompt  = buildPrompt(modelStyle, garmentDesc);

    // Generate 2 images sequentially (dall-e-3 only supports n=1 per call)
    const [r1, r2] = await Promise.all([
      openai.images.generate({
        model:   'dall-e-3',
        prompt,
        n:       1,
        size:    '1024x1792',   // portrait — ideal for fashion
        quality: 'standard',
        style:   'natural',
      }),
      openai.images.generate({
        model:   'dall-e-3',
        prompt:  prompt + ' Slightly different pose and angle.',
        n:       1,
        size:    '1024x1792',
        quality: 'standard',
        style:   'natural',
      }),
    ]);

    const images = [
      { url: r1.data[0]?.url ?? null, b64: null },
      { url: r2.data[0]?.url ?? null, b64: null },
    ].filter(img => img.url !== null);

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[scan-model-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
