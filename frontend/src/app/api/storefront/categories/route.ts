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
 * Queries products.gender + products.category directly (no separate
 * categories table, no status/category_id columns needed).
 *
 * Returns a grouped nav structure:
 * [
 *   { gender: 'women',       categories: [{ slug, label }, ...] },
 *   { gender: 'men',         categories: [...] },
 *   ...   // only groups with ≥1 product appear
 * ]
 *
 * Adding a new product with a new category automatically surfaces it
 * in the nav on the next request (CDN revalidation ~60 s).
 */
export async function GET() {
  // Fetch distinct gender + category combos directly from products
  const { data: rows, error } = await supabase
    .from('products')
    .select('gender, category')
    .not('gender', 'is', null)
    .not('category', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json([]);

  // Normalise gender values to lowercase for matching
  type CatItem = { slug: string; label: string };
  const grouped: Record<Gender, CatItem[]> = {
    women: [],
    men: [],
    kids: [],
    accessories: [],
  };
  const seen: Record<Gender, Set<string>> = {
    women: new Set(),
    men: new Set(),
    kids: new Set(),
    accessories: new Set(),
  };

  for (const row of rows as Array<{ gender: string; category: string }>) {
    const g = row.gender?.toLowerCase().trim() as Gender;
    const cat = row.category?.trim();

    if (!g || !cat) continue;
    if (!GENDER_ORDER.includes(g)) continue;
    if (seen[g].has(cat)) continue;

    seen[g].add(cat);
    grouped[g].push({
      slug: cat.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      label: cat,
    });
  }

  // Sort categories alphabetically within each group
  for (const g of GENDER_ORDER) {
    grouped[g].sort((a, b) => a.label.localeCompare(b.label));
  }

  // Only include groups that have ≥1 category
  const result = GENDER_ORDER
    .filter(g => grouped[g].length > 0)
    .map(g => ({
      gender: g,
      categories: grouped[g].map((c, i) => ({
        id: c.slug,
        slug: c.slug,
        label: c.label,
        sort_order: i,
      })),
    }));

  return NextResponse.json(result, {
    headers: {
      // Cache 60 s on CDN; serve stale up to 5 min while revalidating
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}
