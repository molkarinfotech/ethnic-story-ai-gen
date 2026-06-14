import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

// ── auth helper (same pattern used across admin routes) ──────────────────────
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return !!cookieStore.get('admin_session')?.value;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const formData   = await req.formData();
    const imageFile  = formData.get('image') as File | null;
    const modelStyle = (formData.get('style') as string | null) ?? 'studio';
    const garmentDesc = (formData.get('description') as string | null) ?? 'ethnic Indian garment';

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Style → prompt map
    const stylePrompts: Record<string, string> = {
      studio:
        'A professional studio fashion photograph of a female model wearing this exact ethnic Indian garment. ' +
        'Clean white studio background, soft diffused lighting, full-body shot, model standing naturally. ' +
        'High-end e-commerce product photography style. The garment details, embroidery, and colours must be preserved exactly.',
      outdoor:
        'A beautiful outdoor fashion photograph of a female model wearing this exact ethnic Indian garment. ' +
        'Soft natural daylight, lush garden or heritage architecture background subtly blurred. ' +
        'Editorial fashion photography style. The garment details, embroidery, and colours must be preserved exactly.',
      editorial:
        'A high-fashion editorial photograph of a South Asian female model wearing this exact ethnic Indian garment. ' +
        'Dramatic studio lighting with shadows, minimalist dark background, Vogue-style composition. ' +
        'Luxury fashion magazine aesthetic. The garment details, embroidery, and colours must be preserved exactly.',
    };

    const prompt = `${stylePrompts[modelStyle] ?? stylePrompts.studio} The clothing is described as: ${garmentDesc}.`;

    // Convert File → base64 data URL (required by OpenAI SDK)
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');
    const mimeType    = imageFile.type || 'image/jpeg';
    const dataUrl     = `data:${mimeType};base64,${base64}`;

    // Call OpenAI gpt-image-1 (supports image input natively)
    const response = await openai.images.generate({
      model:           'gpt-image-1',
      prompt,
      // @ts-ignore — gpt-image-1 accepts image input via extra body
      image:           dataUrl,
      n:               2,
      size:            '1024x1536',   // portrait — ideal for fashion
      quality:         'standard',
      output_format:   'url',
    });

    const images = (response.data ?? []).map((d: { url?: string; b64_json?: string }) => ({
      url:     d.url     ?? null,
      b64:     d.b64_json ?? null,
    }));

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[scan-model-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
