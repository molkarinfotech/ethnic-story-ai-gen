import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Public storefront endpoint — no auth required.
 * Returns only categories that have at least one published product,
 * ordered by sort_order. This drives the dynamic nav groups.
 */
export async function GET() {
  // Fetch all active categories
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, label, genders, sort_order')
    .order('sort_order', { ascending: true });

  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });
  if (!categories || categories.length === 0) return NextResponse.json([]);

  // Get the distinct category_id values that have at least one published product
  const { data: productCats, error: prodErr } = await supabase
    .from('products')
    .select('category_id')
    .eq('status', 'published');

  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });

  const activeCatIds = new Set(
    (productCats ?? []).map((p: { category_id: string }) => p.category_id)
  );

  // Return only categories that have at least one published product
  const filtered = categories.filter((c: { id: string }) => activeCatIds.has(c.id));

  return NextResponse.json(filtered, {
    headers: {
      // Cache for 60 s on CDN, allow stale-while-revalidate for 5 min
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}
