import { getServiceSupabase } from './supabase';
import { PRODUCTS } from './products';

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  price: number;
  original_price?: number;
  originalPrice?: number;
  category: string;
  badge?: string;
  image?: string;
  in_stock?: boolean;
};

function normalise(p: Record<string, unknown>): Product {
  return {
    ...p,
    originalPrice: (p.original_price as number) ?? undefined,
  } as Product;
}

/**
 * Fetch ALL products from Supabase using the service role client (works on the server).
 * Falls back to the static list only if Supabase is completely unreachable — this
 * should never happen in production but prevents a blank page during local dev
 * without env vars.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getProducts] Supabase error, falling back to static list:', error.message);
      return PRODUCTS as Product[];
    }

    // Always prefer live data — even if the table only has 1 row
    if (data && data.length > 0) return data.map(normalise);

    // Table exists but is empty — return empty (don't silently show stale static data)
    return [];
  } catch (e) {
    console.warn('[getProducts] fetch failed, using static fallback:', e);
    return PRODUCTS as Product[];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      // Fall back to static list so legacy hardcoded slugs still resolve
      const fallback = PRODUCTS.find(p => p.slug === slug);
      return fallback ? (fallback as unknown as Product) : null;
    }
    return normalise(data);
  } catch {
    const fallback = PRODUCTS.find(p => p.slug === slug);
    return fallback ? (fallback as unknown as Product) : null;
  }
}
