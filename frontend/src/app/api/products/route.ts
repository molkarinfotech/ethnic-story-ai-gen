import { NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServiceSupabase();

  // Fetch products + their first gallery image in one round-trip via a
  // Supabase nested select. product_images is ordered by sort_order so
  // limit(1) gives us the canonical display image.
  const { data, error } = await sb
    .from('products')
    .select(`
      *,
      product_images (
        url,
        sort_order
      )
    `)
    .eq('in_stock', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve the display image: first gallery image (lowest sort_order)
  // takes priority over the legacy products.image column.
  const resolved = (data ?? []).map((p: any) => {
    const imgs: { url: string; sort_order: number }[] = p.product_images ?? [];
    imgs.sort((a, b) => a.sort_order - b.sort_order);
    const firstGalleryImage = imgs[0]?.url ?? null;
    const { product_images: _drop, ...rest } = p;
    return {
      ...rest,
      image: firstGalleryImage ?? rest.image ?? null,
    };
  });

  return NextResponse.json(resolved, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
