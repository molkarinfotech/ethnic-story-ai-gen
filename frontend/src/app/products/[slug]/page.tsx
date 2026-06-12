import { PRODUCTS } from '../../../lib/products';

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = PRODUCTS.find(p => p.slug === params.slug);

  if (!product) {
    return (
      <main>
        <div className="container section">
          <h1>Product not found</h1>
          <a href="/collections" className="btn btn--primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to Collections</a>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container section">
        <div className="breadcrumb"><a href="/">Home</a> › <a href="/collections">Collections</a> › <a href={`/collections/${product.category}`}>{product.category}</a> › {product.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginTop: '2rem', alignItems: 'start' }}>
          <div style={{ background: 'linear-gradient(135deg,#f0e4d7,#e8d5c4)', borderRadius: 'var(--radius)', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10rem' }}>
            {product.emoji || '👗'}
          </div>
          <div>
            {product.badge && <span className="tag" style={{ marginBottom: '1rem', display: 'inline-block' }}>{product.badge}</span>}
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{product.name}</h1>
            {product.subtitle && <p style={{ color: 'var(--color-muted)', fontFamily: 'system-ui', marginBottom: '1.5rem' }}>{product.subtitle}</p>}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '2rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'system-ui' }}>₹{product.priceInr.toLocaleString('en-IN')}</span>
              {product.originalPriceInr && <s style={{ color: 'var(--color-muted)', fontFamily: 'system-ui' }}>₹{product.originalPriceInr.toLocaleString('en-IN')}</s>}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <button className="btn btn--primary" style={{ flex: 1 }}>Add to Cart</button>
              <button className="btn btn--outline">♡ Wishlist</button>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', fontFamily: 'system-ui', fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--color-muted)' }}>
              <p>🚚 Free shipping on orders above ₹2,500</p>
              <p>↩️ 15-day hassle-free returns</p>
              <p>✅ 100% authentic, handcrafted piece</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
