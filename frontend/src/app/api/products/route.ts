import { NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServiceSupabase();

  // Fetch all in-stock products
  const { data: products, error } = await sb
    .from('products')
    .select('*')
    .eq('in_stock', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!products || products.length === 0) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });

  // Fetch first image per product via a separate query (more reliable than
  // a nested join which requires PostgREST FK schema cache registration)
  const ids = products.map((p: any) => p.id as string);
  const { data: imgRows } = await sb
    .from('product_images')
    .select('product_id, url, sort_order')
    .in('product_id', ids)
    .order('sort_order', { ascending: true });

  // Build a map: product_id -> first image url
  const firstImageMap = new Map<string, string>();
  for (const row of imgRows ?? []) {
    if (!firstImageMap.has(row.product_id)) firstImageMap.set(row.product_id, row.url);
  }

  // Resolve each product's display image
  const resolved = products.map((p: any) => ({
    ...p,
    image: firstImageMap.get(p.id) ?? p.image ?? null,
  }));

  return NextResponse.json(resolved, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
