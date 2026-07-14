import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fixed display order for the four top-level nav groups
const GENDER_ORDER = ['women', 'men', 'kids', 'accessories'] as const;
type Gender = typeof GENDER_ORDER[number];

/**
 * Public storefront endpoint — no auth required.
 *
 * Returns a grouped nav structure:
 * [
 *   { gender: 'women',       categories: [{ id, slug, label, sort_order }, ...] },
 *   { gender: 'accessories', categories: [...] },
 *   ...                           // only groups with ≥1 published product appear
 * ]
 *
 * A group only appears when at least one category under that gender
 * has a published product. New products automatically surface their
 * category in the correct group on next request (CDN revalidation ~60 s).
 */
export async function GET() {
  // 1. Fetch every category (id, slug, label, genders[], sort_order)
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, label, genders, sort_order')
    .order('sort_order', { ascending: true });

  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });
  if (!categories || categories.length === 0) return NextResponse.json([]);

  // 2. Get distinct category_ids that have ≥1 published product
  const { data: productRows, error: prodErr } = await supabase
    .from('products')
    .select('category_id')
    .eq('status', 'published');

  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });

  const activeCatIds = new Set(
    (productRows ?? []).map((p: { category_id: string }) => p.category_id)
  );

  // 3. Keep only categories that have ≥1 published product
  const activeCategories = categories.filter(
    (c: { id: string }) => activeCatIds.has(c.id)
  );

  // 4. Group active categories by gender, respecting GENDER_ORDER
  //    A category can appear under multiple groups if its genders[] has multiple values.
  type CatItem = { id: string; slug: string; label: string; sort_order: number };
  const grouped: Record<Gender, CatItem[]> = {
    women: [],
    men: [],
    kids: [],
    accessories: [],
  };

  // Track which category slugs we've already added per gender to avoid duplicates
  const seen: Record<Gender, Set<string>> = {
    women: new Set(),
    men: new Set(),
    kids: new Set(),
    accessories: new Set(),
  };

  for (const cat of activeCategories as Array<{ id: string; slug: string; label: string; genders: string[]; sort_order: number }>) {
    for (const g of (cat.genders ?? []) as Gender[]) {
      if (!GENDER_ORDER.includes(g)) continue;
      if (seen[g].has(cat.slug)) continue;
      seen[g].add(cat.slug);
      grouped[g].push({ id: cat.id, slug: cat.slug, label: cat.label, sort_order: cat.sort_order ?? 99 });
    }
  }

  // 5. Build final array — only include groups that have ≥1 category
  const result = GENDER_ORDER
    .filter(g => grouped[g].length > 0)
    .map(g => ({
      gender: g,
      categories: grouped[g], // already sorted by sort_order from step 1
    }));

  return NextResponse.json(result, {
    headers: {
      // Cache 60 s on CDN; serve stale up to 5 min while revalidating
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}
