import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getServiceSupabase();

  // Fetch product row
  const { data: product, error } = await sb
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 });
  }

  // Fetch colour images from product_images (the single source of truth)
  const { data: imgRows } = await sb
    .from('product_images')
    .select('colour, url, sort_order')
    .eq('product_id', params.id)
    .order('colour')
    .order('sort_order');

  // Build a flat images array (for backward-compat with ProductCard carousel)
  // and a colourImages map for the PDP
  const colourImages: Record<string, string[]> = {};
  for (const row of imgRows ?? []) {
    const key = row.colour ?? '';
    if (!colourImages[key]) colourImages[key] = [];
    colourImages[key].push(row.url);
  }

  const allImageUrls = (imgRows ?? []).map((r: { url: string }) => r.url);

  // If product_images is empty, fall back to legacy images[] column on the product row
  const legacyImages: string[] = Array.isArray(product.images) ? product.images : [];
  const images = allImageUrls.length > 0 ? allImageUrls : legacyImages;

  // Primary image: first product_images entry, then product.image, then first legacy
  const image = images[0] ?? product.image ?? null;

  return NextResponse.json(
    { ...product, image, images, colourImages },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  );
}
