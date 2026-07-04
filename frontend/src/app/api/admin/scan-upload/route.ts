import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return !!cookieStore.get('admin_session')?.value || !!cookieStore.get('admin_token')?.value;
  } catch {
    return false;
  }
}

/**
 * Normalise colour to consistent Title Case so product_images.colour
 * always matches product_variants.colour (prevents silent mismatch).
 * Examples: 'red' → 'Red', 'DEEP BLUE' → 'Deep Blue', '' → 'Unassigned'
 */
export function normaliseColour(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'Unassigned';
  return trimmed
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Uploads image to Supabase Storage and inserts into product_images
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData  = await req.formData();
  const file      = formData.get('image')      as File   | null;
  const productId = formData.get('product_id') as string | null;
  const colourRaw = formData.get('colour')     as string | null;
  const sortStr   = formData.get('sort_order') as string | null;
  const sort_order = sortStr ? parseInt(sortStr, 10) : 0;

  if (!file)      return NextResponse.json({ error: 'image required' },      { status: 400 });
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const colour     = normaliseColour(colourRaw);
  const colourSlug = colour.replace(/\s+/g, '-').toLowerCase();

  const sb = getServiceSupabase();

  const ext         = file.type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${productId}/${colourSlug}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  const { error: uploadErr } = await sb.storage
    .from('product-images')
    .upload(storagePath, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: urlData } = sb.storage
    .from('product-images')
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const { data: imgRow, error: insertErr } = await sb
    .from('product_images')
    .insert({ product_id: productId, colour, url: publicUrl, sort_order })
    .select('id, colour, url, sort_order')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, image: imgRow, url: publicUrl });
}
