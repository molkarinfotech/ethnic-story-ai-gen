import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Replicate from 'replicate';

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return !!cookieStore.get('admin_session')?.value || !!cookieStore.get('admin_token')?.value;
  } catch {
    return false;
  }
}

function buildStyleSuffix(style: string): string {
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
  return styles[style] ?? styles.studio;
}

function buildAutoPrompt(style: string, description: string): string {
  return `${description} ${buildStyleSuffix(style)}`;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateOne(
  replicate: Replicate,
  prompt: string,
  inputImage: string | null,
  maxRetries = 4,
): Promise<string | null> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      let output: unknown;

      if (inputImage) {
        // Image-to-image: flux-kontext-pro conditions on the scanned garment
        // Note: flux-kontext-pro only accepts "jpg" or "png" — webp is rejected (422)
        output = await replicate.run(
          'black-forest-labs/flux-kontext-pro' as `${string}/${string}`,
          {
            input: {
              prompt,
              input_image:      inputImage,
              aspect_ratio:     '9:16',
              output_format:    'jpg',
              output_quality:   90,
              safety_tolerance: 2,
            },
          },
        );
      } else {
        // Text-only fallback: flux-1.1-pro supports webp but we keep jpg for consistency
        output = await replicate.run(
          'black-forest-labs/flux-1.1-pro',
          {
            input: {
              prompt,
              aspect_ratio:      '9:16',
              output_format:     'jpg',
              output_quality:    90,
              safety_tolerance:  2,
              prompt_upsampling: true,
            },
          },
        );
      }

      if (typeof output === 'string') return output;
      if (Array.isArray(output) && output.length > 0) return String(output[0]);
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 =
        msg.includes('429') ||
        msg.toLowerCase().includes('throttled') ||
        msg.toLowerCase().includes('rate limit');

      if (is429 && attempt < maxRetries) {
        const retryMatch =
          msg.match(/retry[_\s-]after[^\d]*(\d+)/i) ||
          msg.match(/resets in[^\d]*(\d+)/i);
        const retryAfterSec = retryMatch ? parseInt(retryMatch[1], 10) : 12;
        const waitMs = Math.min(
          retryAfterSec * 1000 * Math.pow(2, attempt),
          60_000,
        );
        console.warn(
          `[scan-model-gen] 429 on attempt ${attempt + 1}/${maxRetries + 1}. Waiting ${waitMs}ms…`,
        );
        await sleep(waitMs);
        attempt++;
        continue;
      }
      throw err;
    }
  }
  return null;
}

/** Convert an uploaded File (from FormData) to a base64 data URI */
async function fileToDataUri(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mime   = file.type || 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const formData    = await req.formData();
    const modelStyle  = (formData.get('style')       as string | null) ?? 'studio';
    const rawPrompt   = (formData.get('prompt')      as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim()
      ?? 'A South Asian female model wearing an ethnic Indian garment.';
    const imageFile   = formData.get('image') as File | null;

    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN not configured on this server' },
        { status: 500 },
      );
    }

    // Convert scan image to data URI for Replicate input_image (if provided)
    let inputImage: string | null = null;
    if (imageFile && imageFile.size > 0) {
      inputImage = await fileToDataUri(imageFile);
    }

    const replicate = new Replicate({ auth: apiKey });

    const basePrompt = rawPrompt ?? description;
    const prompt1    = buildAutoPrompt(modelStyle, basePrompt);
    const prompt2    = buildAutoPrompt(
      modelStyle,
      basePrompt + ' Slightly different pose and camera angle.',
    );

    // Generate sequentially to stay within burst limits
    const url1 = await generateOne(replicate, prompt1, inputImage);
    await sleep(11_000);
    const url2 = await generateOne(replicate, prompt2, inputImage);

    const images = [url1, url2]
      .filter(Boolean)
      .map(url => ({ url, b64: null }));

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images were generated. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const msg   = err instanceof Error ? err.message : 'Unknown error';
    const is429 =
      msg.includes('429') ||
      msg.toLowerCase().includes('throttled') ||
      msg.toLowerCase().includes('rate limit');
    console.error('[scan-model-gen]', msg);
    return NextResponse.json(
      {
        error: is429
          ? 'Replicate rate limit hit. Please wait ~1 minute and try again, or add credits at replicate.com/account/billing.'
          : msg,
      },
      { status: is429 ? 429 : 500 },
    );
  }
}
