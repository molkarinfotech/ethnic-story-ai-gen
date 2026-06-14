import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';

// 3 showcase products with per-COLOUR image arrays and colour+size variants
const COLOUR_PRODUCTS: Array<{
  slug: string;
  colourImages: Array<{ colour: string; urls: string[] }>;
  variants: { size: string; colour: string; stock_count: number }[];
}> = [
  {
    slug: 'banarasi-silk-saree',
    colourImages: [
      {
        colour: 'Red',
        urls: [
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=900&auto=format&fit=crop',
        ],
      },
      {
        colour: 'Royal Blue',
        urls: [
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=900&auto=format&fit=crop',
        ],
      },
      {
        colour: 'Emerald Green',
        urls: [
          'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=900&auto=format&fit=crop',
        ],
      },
    ],
    variants: [
      { size: 'Free Size', colour: 'Red',          stock_count: 8 },
      { size: 'Free Size', colour: 'Royal Blue',   stock_count: 5 },
      { size: 'Free Size', colour: 'Emerald Green',stock_count: 3 },
    ],
  },
  {
    slug: 'bridal-lehenga-red',
    colourImages: [
      {
        colour: 'Red',
        urls: [
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=900&auto=format&fit=crop',
        ],
      },
      {
        colour: 'Ivory',
        urls: [
          'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=900&auto=format&fit=crop',
        ],
      },
      {
        colour: 'Navy',
        urls: [
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
        ],
      },
    ],
    variants: [
      { size: 'S',  colour: 'Red',   stock_count: 2 },
      { size: 'M',  colour: 'Red',   stock_count: 4 },
      { size: 'L',  colour: 'Red',   stock_count: 3 },
      { size: 'XL', colour: 'Red',   stock_count: 1 },
      { size: 'S',  colour: 'Ivory', stock_count: 3 },
      { size: 'M',  colour: 'Ivory', stock_count: 6 },
      { size: 'L',  colour: 'Ivory', stock_count: 2 },
      { size: 'XL', colour: 'Ivory', stock_count: 0 },
      { size: 'S',  colour: 'Navy',  stock_count: 5 },
      { size: 'M',  colour: 'Navy',  stock_count: 4 },
      { size: 'L',  colour: 'Navy',  stock_count: 0 },
      { size: 'XL', colour: 'Navy',  stock_count: 3 },
    ],
  },
  {
    slug: 'cotton-block-print-kurta',
    colourImages: [
      {
        colour: 'Indigo',
        urls: [
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=900&auto=format&fit=crop',
        ],
      },
      {
        colour: 'Mustard',
        urls: [
          'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=900&auto=format&fit=crop',
        ],
      },
      {
        colour: 'White',
        urls: [
          'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=900&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=900&auto=format&fit=crop',
        ],
      },
    ],
    variants: [
      { size: 'XS', colour: 'Indigo',  stock_count: 4 },
      { size: 'S',  colour: 'Indigo',  stock_count: 7 },
      { size: 'M',  colour: 'Indigo',  stock_count: 6 },
      { size: 'L',  colour: 'Indigo',  stock_count: 3 },
      { size: 'XL', colour: 'Indigo',  stock_count: 2 },
      { size: 'XS', colour: 'Mustard', stock_count: 5 },
      { size: 'S',  colour: 'Mustard', stock_count: 8 },
      { size: 'M',  colour: 'Mustard', stock_count: 4 },
      { size: 'L',  colour: 'Mustard', stock_count: 0 },
      { size: 'XL', colour: 'Mustard', stock_count: 2 },
      { size: 'XS', colour: 'White',   stock_count: 10 },
      { size: 'S',  colour: 'White',   stock_count: 10 },
      { size: 'M',  colour: 'White',   stock_count: 8 },
      { size: 'L',  colour: 'White',   stock_count: 5 },
      { size: 'XL', colour: 'White',   stock_count: 3 },
    ],
  },
];

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();

  let updatedProducts = 0;
  let insertedImages  = 0;
  let upsertedVariants = 0;

  for (const cp of COLOUR_PRODUCTS) {
    const { data: prod } = await sb
      .from('products')
      .select('id')
      .eq('slug', cp.slug)
      .single();
    if (!prod) continue;

    // Delete existing product_images rows for this product so we start clean
    await sb.from('product_images').delete().eq('product_id', prod.id);

    // Insert per-colour images
    for (const ci of cp.colourImages) {
      const rows = ci.urls.map((url, idx) => ({
        product_id: prod.id,
        colour: ci.colour,
        url,
        sort_order: idx,
      }));
      const { error } = await sb.from('product_images').insert(rows);
      if (!error) insertedImages += rows.length;
    }
    updatedProducts++;

    // Upsert colour+size variants
    const variantRows = cp.variants.map(v => ({ product_id: prod.id, ...v }));
    const { error: varErr } = await sb
      .from('product_variants')
      .upsert(variantRows, { onConflict: 'product_id,size,colour' });
    if (!varErr) upsertedVariants += variantRows.length;
  }

  return NextResponse.json({
    message: `Updated ${updatedProducts} products, inserted ${insertedImages} images, upserted ${upsertedVariants} variants.`,
  });
}
