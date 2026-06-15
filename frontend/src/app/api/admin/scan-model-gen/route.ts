import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Replicate from 'replicate';

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    // Accept both cookie names for backward compatibility
    return !!cookieStore.get('admin_session')?.value || !!cookieStore.get('admin_token')?.value;
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

/** Sleep for ms milliseconds */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Run a single Replicate prediction with automatic 429 retry + exponential backoff */
async function generateOne(
  replicate: Replicate,
  prompt: string,
  maxRetries = 4
): Promise<string | null> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.toLowerCase().includes('throttled') || msg.toLowerCase().includes('rate limit');

      if (is429 && attempt < maxRetries) {
        // Parse retry_after from error message if present (e.g. "resets in ~10s")
        const retryMatch = msg.match(/retry[_\s-]after[^\d]*(\d+)/i) || msg.match(/resets in[^\d]*(\d+)/i);
        const retryAfterSec = retryMatch ? parseInt(retryMatch[1], 10) : 12;
        // Exponential backoff: retryAfterSec * 2^attempt, capped at 60s
        const waitMs = Math.min((retryAfterSec * 1000) * Math.pow(2, attempt), 60_000);
        console.warn(`[scan-model-gen] 429 on attempt ${attempt + 1}/${maxRetries + 1}. Waiting ${waitMs}ms before retry…`);
        await sleep(waitMs);
        attempt++;
        continue;
      }
      throw err;
    }
  }
  return null;
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

    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN not configured on this server' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({ auth: apiKey });

    const basePrompt = rawPrompt ?? description;
    const prompt1    = buildAutoPrompt(modelStyle, basePrompt);
    const prompt2    = buildAutoPrompt(modelStyle, basePrompt + ' Slightly different pose and camera angle.');

    // Generate SEQUENTIALLY to avoid burst-limit (1 req/burst on low-credit accounts)
    const url1 = await generateOne(replicate, prompt1);
    // Small gap between requests to stay within 6 req/min rate limit
    await sleep(11_000);
    const url2 = await generateOne(replicate, prompt2);

    const images = [url1, url2]
      .filter(Boolean)
      .map(url => ({ url, b64: null }));

    if (images.length === 0) {
      return NextResponse.json({ error: 'No images were generated. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const is429 = msg.includes('429') || msg.toLowerCase().includes('throttled') || msg.toLowerCase().includes('rate limit');
    console.error('[scan-model-gen]', msg);
    return NextResponse.json(
      {
        error: is429
          ? 'Replicate rate limit hit. Your account has limited credits — please wait ~1 minute and try again, or add credits at replicate.com/account/billing.'
          : msg,
      },
      { status: is429 ? 429 : 500 }
    );
  }
}
