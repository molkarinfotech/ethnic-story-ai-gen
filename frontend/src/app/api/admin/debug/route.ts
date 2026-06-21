/**
 * GET /api/admin/debug
 * Returns raw product rows + their product_images so you can verify the data
 * Remove this file once issues are confirmed fixed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceSupabase();

  const { data: products, error: pe } = await sb
    .from('products')
    .select('id, name, slug, gender, image, in_stock')
    .order('created_at', { ascending: false });

  if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });

  const ids = (products ?? []).map((p: any) => p.id);

  const { data: images, error: ie } = await sb
    .from('product_images')
    .select('id, product_id, url, sort_order, colour')
    .in('product_id', ids)
    .order('sort_order', { ascending: true });

  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 });

  // Join: attach images to each product
  const imgMap = new Map<string, any[]>();
  for (const img of images ?? []) {
    if (!imgMap.has(img.product_id)) imgMap.set(img.product_id, []);
    imgMap.get(img.product_id)!.push(img);
  }

  const result = (products ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    gender: p.gender,
    legacy_image: p.image,
    in_stock: p.in_stock,
    gallery_images: imgMap.get(p.id) ?? [],
  }));

  return NextResponse.json(result, {
    headers: { 'Content-Type': 'application/json' },
  });
}
