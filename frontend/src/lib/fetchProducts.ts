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

// Normalise DB snake_case to camelCase so existing components work unchanged
function normalise(p: Record<string, unknown>): Product {
  return {
    ...p,
    originalPrice: (p.original_price as number) ?? undefined,
  } as Product;
}

// Fetch live products from Supabase; fall back to hardcoded list on error
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
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

    if (error || !data) return null;
    return normalise(data);
  } catch {
    return null;
  }
}
