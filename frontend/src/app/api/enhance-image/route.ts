import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '../../../lib/admin-auth';

export const maxDuration = 60;

const BUCKET = 'product-images';

// GET handler removed — it previously exposed environment variable status publicly.
// If you need to check env health, use your hosting dashboard.

export async function POST(req: NextRequest) {
  // Only admin users may trigger image enhancement
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    if (!hfToken) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_TOKEN not set' }, { status: 500 });
    }

    const { imageUrl, productId } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

    const srcRes = await fetch(imageUrl);
    if (!srcRes.ok) throw new Error(`Could not fetch source image (${srcRes.status})`);
    const srcBuffer = await srcRes.arrayBuffer();

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
      throw new Error(`HuggingFace error ${hfRes.status}: ${errText.slice(0, 200)}`);
    }

    const enhancedBuffer = await hfRes.arrayBuffer();

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const fileName = productId
      ? `enhanced/${productId}-${Date.now()}.jpg`
      : `enhanced/${Date.now()}.jpg`;

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(fileName, enhancedBuffer, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[enhance-image]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
