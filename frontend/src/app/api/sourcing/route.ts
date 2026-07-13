import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const fd   = await req.formData();
    const name  = (fd.get('name')  as string | null) ?? '';
    const email = (fd.get('email') as string | null) ?? '';
    const desc  = (fd.get('description') as string | null) ?? '';
    const file  = fd.get('image') as File | null;

    if (!email || !desc) {
      return NextResponse.json({ error: 'email and description required' }, { status: 400 });
    }

    let imageUrl: string | null = null;

    // Upload image to Supabase Storage if provided
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const bytes = await file.arrayBuffer();
      const { error: upErr } = await sb.storage
        .from('sourcing-requests')
        .upload(path, bytes, { contentType: file.type, upsert: false });

      if (!upErr) {
        const { data } = sb.storage.from('sourcing-requests').getPublicUrl(path);
        imageUrl = data.publicUrl;
      } else {
        console.warn('[sourcing] storage upload failed:', upErr.message);
      }
    }

    // Insert into DB
    const { error: dbErr } = await sb.from('sourcing_requests').insert({
      name: name || null,
      email,
      description: desc,
      image_url: imageUrl,
      status: 'pending',
    });

    if (dbErr) {
      // Graceful fallback — still acknowledge the user even if table doesn't exist yet
      console.error('[sourcing] db insert error:', dbErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[sourcing] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
