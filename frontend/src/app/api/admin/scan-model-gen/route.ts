import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Replicate from 'replicate';

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return !!cookieStore.get('admin_session')?.value;
  } catch {
    return false;
  }
}

function buildAutoPrompt(style: string, description: string): string {
  const styles: Record<string, string> = {
    studio:
      'Clean white studio background, soft diffused lighting from both sides, full-body shot, ' +
      'model standing in a natural relaxed pose, luxury e-commerce product photography, ' +
      'sharp focus on the garment, 4K quality.',
    outdoor:
      'Beautiful outdoor setting with soft natural daylight, lush garden or Indian heritage ' +
      'palace architecture softly blurred in background, editorial fashion photography, ' +
      'golden hour lighting, full-body shot, sharp focus on the garment.',
    editorial:
      'Dramatic high-fashion studio lighting with deep shadows, minimalist dark gradient background, ' +
      'Vogue India editorial style, professional model pose, luxury fashion magazine aesthetic, ' +
      'cinematic colour grading, sharp focus on every garment detail.',
  };
  return `${description} ${styles[style] ?? styles.studio}`;
}

async function generateOne(
  replicate: Replicate,
  prompt: string
): Promise<string | null> {
  const output = await replicate.run(
    'black-forest-labs/flux-1.1-pro',
    {
      input: {
        prompt,
        aspect_ratio:      '9:16',
        output_format:     'webp',
        output_quality:    90,
        safety_tolerance:  2,
        prompt_upsampling: true,
      },
    }
  );
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output.length > 0) return String(output[0]);
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const formData   = await req.formData();
    const modelStyle = (formData.get('style')  as string | null) ?? 'studio';
    // 'prompt' is the full manual/auto prompt from the UI
    // 'description' is the legacy fallback if prompt is not provided
    const rawPrompt  = (formData.get('prompt') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim()
      ?? 'A South Asian female model wearing an ethnic Indian garment.';

    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN not configured on this server' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({ auth: apiKey });

    // If the UI sends a raw prompt (manual or auto-built), use it directly with style suffix.
    // Otherwise fall back to the legacy auto-builder.
    const basePrompt = rawPrompt ?? description;
    const prompt1    = buildAutoPrompt(modelStyle, basePrompt);
    const prompt2    = buildAutoPrompt(modelStyle, basePrompt + ' Slightly different pose and camera angle.');

    const [url1, url2] = await Promise.all([
      generateOne(replicate, prompt1),
      generateOne(replicate, prompt2),
    ]);

    const images = [url1, url2]
      .filter(Boolean)
      .map(url => ({ url, b64: null }));

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[scan-model-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
