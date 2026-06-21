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

function normalise(p: Record<string, unknown>): Product {
  // Resolve the display image: first gallery image takes priority over
  // the legacy products.image column.
  const imgs = (p.product_images as { url: string; sort_order: number }[] | undefined) ?? [];
  imgs.sort((a, b) => a.sort_order - b.sort_order);
  const firstGalleryImage = imgs[0]?.url ?? null;

  return {
    ...p,
    image: firstGalleryImage ?? (p.image as string | undefined) ?? undefined,
    originalPrice: (p.original_price as number) ?? undefined,
    gender: (p.gender as Gender) ?? undefined,
  } as Product;
}

export async function getProducts(): Promise<Product[]> {
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('products')
      .select(`
        *,
        product_images (
          url,
          sort_order
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getProducts] Supabase error, falling back to static list:', error.message);
      return PRODUCTS as Product[];
    }

    if (data && data.length > 0) return data.map(normalise);
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
      .select(`
        *,
        product_images (
          url,
          sort_order
        )
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      const fallback = PRODUCTS.find(p => p.slug === slug);
      return fallback ? (fallback as unknown as Product) : null;
    }
    return normalise(data);
  } catch {
    const fallback = PRODUCTS.find(p => p.slug === slug);
    return fallback ? (fallback as unknown as Product) : null;
  }
}
