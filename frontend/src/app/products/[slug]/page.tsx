import { PRODUCTS } from '../../../lib/products';
import { notFound } from 'next/navigation';
import { AddToCartSection } from '../../../components/shop/AddToCartSection';

export function generateStaticParams() {
  return PRODUCTS.map(p => ({ slug: p.slug }));
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = PRODUCTS.find(p => p.slug === params.slug);
  if (!product) notFound();

  const related = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const discount = product.originalPriceInr
    ? Math.round((1 - product.priceInr / product.originalPriceInr) * 100)
    : null;

  const categoryLabel: Record<string, string> = {
    sarees: 'Sarees', lehengas: 'Lehengas', kurtas: 'Kurtas', kids: 'Kids Wear',
  };

  return (
    <main>
      {/* Breadcrumb */}
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

      {/* Product Detail */}
      <section className="section">
        <div className="container">
          <div className="pdp-grid">
            {/* Image */}
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

            {/* Info + Add to Cart */}
            <div className="pdp-info">
              <span className="pill" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
                {categoryLabel[product.category]}
              </span>
              <h1 className="pdp-title">{product.name}</h1>
              {product.subtitle && <p className="pdp-subtitle">{product.subtitle}</p>}

              <div className="pdp-price-row">
                <span className="pdp-price">₹{product.priceInr.toLocaleString('en-IN')}</span>
                {product.originalPriceInr && (
                  <s className="pdp-original">₹{product.originalPriceInr.toLocaleString('en-IN')}</s>
                )}
                {discount && <span className="pdp-save">{discount}% off</span>}
              </div>

              <AddToCartSection product={product} />

              {/* Trust Badges */}
              <div className="pdp-trust">
                {['🚚 Free shipping above ₹2,500', '↩️ 15-day easy returns', '✅ 100% authentic, direct from artisans', '🔒 Secure checkout'].map(t => (
                  <div key={t} className="pdp-trust-item">{t}</div>
                ))}
              </div>

              {/* Details */}
              <details className="pdp-accordion">
                <summary>Product details</summary>
                <div className="pdp-accordion__body">
                  <p>Handcrafted by skilled artisans using traditional techniques. Each piece is unique and may have slight variations that are part of its handmade character.</p>
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
                  <p>Free standard shipping on orders above ₹2,500. Express delivery available at checkout. Returns accepted within 15 days of delivery in original condition.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
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
                    <div className="product-card__price">₹{p.priceInr.toLocaleString('en-IN')}</div>
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
