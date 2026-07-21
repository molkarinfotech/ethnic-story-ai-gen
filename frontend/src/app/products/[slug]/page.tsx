import { getProducts, getProductBySlug, Product } from '../../../lib/fetchProducts';
import { formatAUD } from '../../../lib/products';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '../../../lib/supabase';
import { ProductPageClient, ColourImages } from '../../../components/shop/ProductPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Capitalise each word — used as fallback when slug not in CATEGORY_LABEL */
function titleCase(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const CATEGORY_LABEL: Record<string, string> = {
  sarees: 'Sarees', lehengas: 'Lehengas', kurtas: 'Kurtas', kids: 'Kids Wear',
  sherwanis: 'Sherwanis', accessories: 'Accessories', anarkalis: 'Anarkalis',
  dupattas: 'Dupattas', salwar: 'Salwar Suits', suits: 'Suits',
};

/**
 * Categories whose /collections/[category]/[subcategory] route is implemented
 * and will resolve without a 404. Gender pages (women/men/kids) use subcategories
 * as a second segment; 'accessories' also has dynamic subcategory pills.
 * All other categories do NOT have a routed subcategory page — show subcat as
 * plain text only so we never generate a broken breadcrumb link.
 */
const ROUTED_SUBCATEGORY_PARENTS = new Set(['women', 'men', 'kids', 'accessories']);

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const sb = getServiceSupabase();

  const { data: imgRows } = await sb
    .from('product_images')
    .select('colour, url, sort_order')
    .eq('product_id', product.id)
    .order('colour')
    .order('sort_order');

  const colourImages: ColourImages = {};
  for (const row of imgRows ?? []) {
    const key = row.colour ?? '';
    if (!colourImages[key]) colourImages[key] = [];
    colourImages[key].push(row.url);
  }

  if (Object.keys(colourImages).length === 0) {
    const { data: prodData } = await sb
      .from('products')
      .select('images')
      .eq('id', product.id)
      .single();
    const legacyImgs: string[] = Array.isArray(prodData?.images) ? prodData.images : [];
    const all = [product.image, ...legacyImgs].filter(Boolean) as string[];
    if (all.length > 0) colourImages[''] = all;
  }

  if (Object.keys(colourImages).length === 0 && product.image) {
    colourImages[''] = [product.image];
  }

  const allProducts = await getProducts();
  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const origPrice = product.original_price ?? product.originalPrice;
  const discount  = origPrice ? Math.round((1 - product.price / origPrice) * 100) : null;

  // Dynamic label — works for any DB category, not just hardcoded four
  const catLabel = CATEGORY_LABEL[product.category] ?? titleCase(product.category);
  // Optional subcategory support
  const subcat = (product as Product & { subcategory?: string }).subcategory;

  // Only generate a clickable subcategory breadcrumb link when the route exists.
  // For all other categories the subcat is shown as non-linked text to avoid 404s.
  const subcatIsLinked = subcat && ROUTED_SUBCATEGORY_PARENTS.has(product.category);

  return (
    <main style={{ background: 'var(--color-bg)' }}>

      {/* Breadcrumb */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)', padding: '.75rem 0' }}>
        <div className="container">
          <nav style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            <a href="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Home</a>
            <span style={{ color: 'var(--color-gold)' }}>/</span>
            <a href="/collections" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Collections</a>
            <span style={{ color: 'var(--color-gold)' }}>/</span>
            <a href={`/collections/${product.category}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>{catLabel}</a>
            {subcat && (
              <>
                <span style={{ color: 'var(--color-gold)' }}>/</span>
                {subcatIsLinked ? (
                  <a
                    href={`/collections/${product.category}/${subcat}`}
                    style={{ color: 'var(--color-text-muted)', textDecoration: 'none', textTransform: 'capitalize' }}
                  >
                    {subcat}
                  </a>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{subcat}</span>
                )}
              </>
            )}
            <span style={{ color: 'var(--color-gold)' }}>/</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{product.name}</span>
          </nav>
        </div>
      </div>

      <section style={{ padding: 'var(--space-16) 0 var(--space-20)' }}>
        <div className="container">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'var(--color-primary-highlight)', color: 'var(--color-primary)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '.35rem .9rem', borderRadius: 'var(--radius-full)' }}>
              {catLabel}
            </span>
          </div>
          <ProductPageClient
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              subtitle: product.subtitle,
              price: product.price,
              originalPrice: origPrice ?? undefined,
              badge: product.badge,
              image: product.image,
              category: product.category,
            }}
            colourImages={colourImages}
            badge={product.badge}
            discount={discount}
            origPrice={origPrice}
          />
        </div>
      </section>

      <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #8b2f54 100%)', padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-gold)', fontSize: '.8rem', letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700 }}>
          ✷   Rooted in Indian Craft   ✷   Designed for Modern Celebrations   ✷
        </div>
      </div>

      {related.length > 0 && (
        <section style={{ padding: 'var(--space-20) 0', background: 'var(--color-surface)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
              <span className="pill">You may also like</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 1rem + 1.5vw, 2.25rem)', marginTop: 'var(--space-4)', color: 'var(--color-text)' }}>More from {catLabel}</h2>
            </div>
            <div className="grid-4">
              {related.map(p => (
                <a key={p.id} href={`/products/${p.slug}`} className="product-card" style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="product-card__image">
                    {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span style={{ fontSize: '4rem' }}>🥻</span>}
                    {p.badge && <span className="product-card__badge">{p.badge}</span>}
                  </div>
                  <div className="product-card__body">
                    <div className="product-card__name">{p.name}</div>
                    {p.subtitle && <div className="product-card__sub">{p.subtitle}</div>}
                    <div className="product-card__price" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{formatAUD(p.price)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
