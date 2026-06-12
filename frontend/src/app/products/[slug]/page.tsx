import { PRODUCTS } from '../../../lib/products';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1583395235451-3e8c9d59641a?q=80&w=800&auto=format&fit=crop';

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = PRODUCTS.find((p) => p.slug === params.slug);

  if (!product) {
    return (
      <main>
        <div className="container section" style={{ textAlign: 'center' }}>
          <h1>Product not found</h1>
          <a href="/collections" className="btn btn--primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Back to Collections</a>
        </div>
      </main>
    );
  }

  const imgSrc = product.image || FALLBACK_IMAGE;
  const discount = product.originalPriceInr
    ? Math.round((1 - product.priceInr / product.originalPriceInr) * 100)
    : null;

  return (
    <main>
      <div className="container section">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href="/">Home</a> &rsaquo;
          <a href="/collections">Collections</a> &rsaquo;
          <a href={`/collections/${product.category}`} style={{ textTransform: 'capitalize' }}>{product.category}</a> &rsaquo;
          <span>{product.name}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem', marginTop: '2rem', alignItems: 'start' }}>

          {/* Image */}
          <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', background: 'linear-gradient(135deg,#f0e4d7,#e8d5c4)', aspectRatio: '4/5' }}>
            <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>

          {/* Details */}
          <div>
            {product.badge && (
              <span className="tag" style={{ marginBottom: '1rem', display: 'inline-block' }}>{product.badge}</span>
            )}
            <h1 style={{ marginBottom: '0.5rem' }}>{product.name}</h1>
            {product.subtitle && (
              <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>{product.subtitle}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'system-ui' }}>
                ₹{product.priceInr.toLocaleString('en-IN')}
              </span>
              {product.originalPriceInr && (
                <s style={{ color: 'var(--color-muted)', fontFamily: 'system-ui' }}>₹{product.originalPriceInr.toLocaleString('en-IN')}</s>
              )}
              {discount && (
                <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'system-ui' }}>
                  {discount}% OFF
                </span>
              )}
            </div>

            <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '2rem' }}>Inclusive of all taxes</p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
              <button className="btn btn--primary" style={{ flex: 1 }}>Add to Cart</button>
              <button className="btn btn--outline">♡ Wishlist</button>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontFamily: 'system-ui', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              <span>🚚 Free shipping on orders above ₹2,500</span>
              <span>↩️ 15-day hassle-free returns</span>
              <span>✅ 100% authentic, handcrafted piece</span>
              <span>🔒 Secure checkout</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
