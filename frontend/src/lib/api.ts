const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchProducts(category?: string) {
  const url = category ? `${API_BASE}/api/products?category=${category}` : `${API_BASE}/api/products`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

export async function fetchProduct(slug: string) {
  const products = await fetchProducts();
  return products.find((p: any) => p.slug === slug) ?? null;
}
