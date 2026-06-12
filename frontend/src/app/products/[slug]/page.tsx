import { getProducts, getProductBySlug, Product } from '../../../lib/fetchProducts';
import { formatAUD } from '../../../lib/products';
import { notFound } from 'next/navigation';
import { AddToCartSection } from '../../../components/shop/AddToCartSection';

export const revalidate = 60;

// Pre-generate pages for all current products at build time;
// new products added via admin will be generated on first visit (dynamic fallback)
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map(p => ({ slug: p.slug }));
}

const categoryLabel: Record<string, string> = {
  sarees: 'Sarees', lehengas: 'Lehengas', kurtas: 'Kurtas', kids: 'Kids Wear',
};

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const allProducts = await getProducts();
  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const origPrice = product.original_price ?? product.originalPrice;
  const discount = origPrice ? Math.round((1 - product.price / origPrice) * 100) : null;

  return (
    <main>
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container">
          <nav className="breadcrumb">
            <a href="/">Home</a><span>/</span>
            <a href="/collections">Collections</a><span>/</span>
            <a href={`/collections/${product.category}`}>{categoryLabel[product.category]}</a><span>/</span>
            <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
          </nav>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="pdp-grid">
            <div className="pdp-gallery">
              <div className="pdp-image">
                {product.image
                  ? <img src={product.image} alt={product.name} />
                  : <span className="pdp-placeholder">🥻</span>
                }
                {product.badge && <span className="pdp-badge">{product.badge}</span>}
                {discount && <span className="pdp-discount">−{discount}%</span>}
              </div>
            </div>

            <div className="pdp-info">
              <span className="pill" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
                {categoryLabel[product.category] ?? product.category}
              </span>
              <h1 className="pdp-title">{product.name}</h1>
              {product.subtitle && <p className="pdp-subtitle">{product.subtitle}</p>}

              <div className="pdp-price-row">
                <span className="pdp-price">{formatAUD(product.price)}</span>
                {origPrice && <s className="pdp-original">{formatAUD(origPrice)}</s>}
                {discount && <span className="pdp-save">{discount}% off</span>}
              </div>

              <AddToCartSection product={{ ...product, originalPrice: origPrice }} />

              <div className="pdp-trust">
                {['🚚 Free shipping on orders over A$150', '↩️ 15-day easy returns', '✅ 100% authentic, direct from artisans', '🔒 Secure checkout'].map(t => (
                  <div key={t} className="pdp-trust-item">{t}</div>
                ))}
              </div>

              <details className="pdp-accordion">
                <summary>Product details</summary>
                <div className="pdp-accordion__body">
                  <p>{(product as Product & { description?: string }).description ?? 'Handcrafted by skilled artisans using traditional techniques. Each piece is unique and may have slight variations that are part of its handmade character.'}</p>
                  <ul style={{ marginTop: 'var(--space-3)', paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                    <li>Fabric: As described in product name</li>
                    <li>Care: Dry clean recommended</li>
                    <li>Origin: Made in India</li>
                    <li>SKU: {product.id.toUpperCase()}</li>
                  </ul>
                </div>
              </details>
              <details className="pdp-accordion">
                <summary>Shipping &amp; returns</summary>
                <div className="pdp-accordion__body">
                  <p>Free standard shipping on orders over A$150. Express delivery available at checkout. Delivered Australia-wide. Returns accepted within 15 days of delivery in original condition.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section" style={{ background: 'var(--color-surface)', paddingTop: 'var(--space-12)' }}>
          <div className="container">
            <div className="section-head">
              <div>
                <span className="pill">You may also like</span>
                <h2 style={{ marginTop: 'var(--space-3)' }}>More from {categoryLabel[product.category]}</h2>
              </div>
            </div>
            <div className="grid-4">
              {related.map(p => (
                <a key={p.id} href={`/products/${p.slug}`} className="product-card">
                  <div className="product-card__image">
                    {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span style={{ fontSize: '4rem' }}>🥻</span>}
                    {p.badge && <span className="product-card__badge">{p.badge}</span>}
                  </div>
                  <div className="product-card__body">
                    <div className="product-card__name">{p.name}</div>
                    {p.subtitle && <div className="product-card__sub">{p.subtitle}</div>}
                    <div className="product-card__price">{formatAUD(p.price)}</div>
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
