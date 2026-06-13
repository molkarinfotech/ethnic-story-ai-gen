import { supabase } from './supabase';
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

// Fetch ALL products from Supabase regardless of in_stock
// Stock availability is handled per-size via product_variants
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn('[getProducts] Supabase error or empty, falling back to static list:', error?.message);
      return PRODUCTS as Product[];
    }
    return data.map(normalise);
  } catch (e) {
    console.warn('[getProducts] fetch failed, using static fallback:', e);
    return PRODUCTS as Product[];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      // Fall back to static list so hardcoded products still work
      const fallback = PRODUCTS.find(p => p.slug === slug);
      return fallback ? (fallback as unknown as Product) : null;
    }
    return normalise(data);
  } catch {
    const fallback = PRODUCTS.find(p => p.slug === slug);
    return fallback ? (fallback as unknown as Product) : null;
  }
}
