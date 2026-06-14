import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';

// 3 showcase products with multi-image arrays and colour variants
const COLOUR_PRODUCTS: Array<{
  slug: string;
  images: string[];
  variants: { size: string; colour: string; stock_count: number }[];
}> = [
  {
    slug: 'banarasi-silk-saree',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=900&auto=format&fit=crop',
    ],
    variants: [
      // Red
      { size: 'Free Size', colour: 'Red', stock_count: 8 },
      // Royal Blue
      { size: 'Free Size', colour: 'Royal Blue', stock_count: 5 },
      // Emerald Green
      { size: 'Free Size', colour: 'Emerald Green', stock_count: 3 },
    ],
  },
  {
    slug: 'bridal-lehenga-red',
    images: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=900&auto=format&fit=crop',
    ],
    variants: [
      // Red
      { size: 'S',  colour: 'Red', stock_count: 2 },
      { size: 'M',  colour: 'Red', stock_count: 4 },
      { size: 'L',  colour: 'Red', stock_count: 3 },
      { size: 'XL', colour: 'Red', stock_count: 1 },
      // Ivory
      { size: 'S',  colour: 'Ivory', stock_count: 3 },
      { size: 'M',  colour: 'Ivory', stock_count: 6 },
      { size: 'L',  colour: 'Ivory', stock_count: 2 },
      { size: 'XL', colour: 'Ivory', stock_count: 0 },
      // Navy
      { size: 'S',  colour: 'Navy', stock_count: 5 },
      { size: 'M',  colour: 'Navy', stock_count: 4 },
      { size: 'L',  colour: 'Navy', stock_count: 0 },
      { size: 'XL', colour: 'Navy', stock_count: 3 },
    ],
  },
  {
    slug: 'cotton-block-print-kurta',
    images: [
      'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=900&auto=format&fit=crop',
    ],
    variants: [
      // Indigo
      { size: 'XS', colour: 'Indigo', stock_count: 4 },
      { size: 'S',  colour: 'Indigo', stock_count: 7 },
      { size: 'M',  colour: 'Indigo', stock_count: 6 },
      { size: 'L',  colour: 'Indigo', stock_count: 3 },
      { size: 'XL', colour: 'Indigo', stock_count: 2 },
      // Mustard
      { size: 'XS', colour: 'Mustard', stock_count: 5 },
      { size: 'S',  colour: 'Mustard', stock_count: 8 },
      { size: 'M',  colour: 'Mustard', stock_count: 4 },
      { size: 'L',  colour: 'Mustard', stock_count: 0 },
      { size: 'XL', colour: 'Mustard', stock_count: 2 },
      // White
      { size: 'XS', colour: 'White', stock_count: 10 },
      { size: 'S',  colour: 'White', stock_count: 10 },
      { size: 'M',  colour: 'White', stock_count: 8 },
      { size: 'L',  colour: 'White', stock_count: 5 },
      { size: 'XL', colour: 'White', stock_count: 3 },
    ],
  },
];

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();

  let updated = 0;
  let variantsUpserted = 0;

  for (const cp of COLOUR_PRODUCTS) {
    // 1. Get product id by slug
    const { data: prod, error: prodErr } = await sb
      .from('products')
      .select('id')
      .eq('slug', cp.slug)
      .single();

    if (prodErr || !prod) continue;

    // 2. Update product images[]
    const { error: updateErr } = await sb
      .from('products')
      .update({ images: cp.images })
      .eq('id', prod.id);

    if (!updateErr) updated++;

    // 3. Upsert colour variants (conflict on product_id, size, colour)
    const rows = cp.variants.map(v => ({ product_id: prod.id, ...v }));
    const { error: varErr } = await sb
      .from('product_variants')
      .upsert(rows, { onConflict: 'product_id,size,colour' });

    if (!varErr) variantsUpserted += rows.length;
  }

  return NextResponse.json({
    message: `Updated ${updated} products, upserted ${variantsUpserted} colour variants.`,
  });
}
