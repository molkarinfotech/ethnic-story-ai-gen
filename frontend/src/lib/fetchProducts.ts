import { getServiceSupabase } from './supabase';
import { PRODUCTS } from './products';

export type Gender = 'women' | 'men' | 'kids' | 'unisex';

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  price: number;
  original_price?: number;
  originalPrice?: number;
  category: string;
  gender?: Gender;
  badge?: string;
  image?: string;
  in_stock?: boolean;
};

function normalise(
  p: Record<string, unknown>,
  firstImageMap: Map<string, string>,
): Product {
  const id = p.id as string;
  const galleryImage = firstImageMap.get(id) ?? null;
  return {
    ...p,
    image: galleryImage ?? (p.image as string | undefined) ?? undefined,
    originalPrice: (p.original_price as number) ?? undefined,
    gender: (p.gender as Gender) ?? undefined,
  } as Product;
}

/** Fetch the first (lowest sort_order) image URL for every product id. */
async function fetchFirstImages(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  try {
    const sb = getServiceSupabase();
    const { data } = await sb
      .from('product_images')
      .select('product_id, url, sort_order')
      .in('product_id', ids)
      .order('sort_order', { ascending: true });
    // Keep only the first url per product (lowest sort_order, already sorted)
    for (const row of data ?? []) {
      if (!map.has(row.product_id)) map.set(row.product_id, row.url);
    }
  } catch {
    // Non-fatal: fall back to products.image column
  }
  return map;
}

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

    if (!data || data.length === 0) return [];

    const ids = data.map((p: any) => p.id as string);
    const imgMap = await fetchFirstImages(ids);

    return data.map((p: any) => normalise(p, imgMap));
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
      const fallback = PRODUCTS.find(p => p.slug === slug);
      return fallback ? (fallback as unknown as Product) : null;
    }

    const imgMap = await fetchFirstImages([data.id]);
    return normalise(data, imgMap);
  } catch {
    const fallback = PRODUCTS.find(p => p.slug === slug);
    return fallback ? (fallback as unknown as Product) : null;
  }
}
