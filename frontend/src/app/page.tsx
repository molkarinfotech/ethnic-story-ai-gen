import { ProductCard } from '../components/shop/ProductCard';
import { PRODUCTS } from '../lib/products';

const COLLECTIONS = [
  { name: 'Sarees', slug: 'sarees', emoji: '🥻', count: 4, desc: 'Timeless drapes for every occasion' },
  { name: 'Lehengas', slug: 'lehengas', emoji: '👘', count: 4, desc: 'Bridal and festive splendour' },
  { name: 'Kurtas', slug: 'kurtas', emoji: '👚', count: 4, desc: 'Everyday ethnic elegance' },
  { name: 'Kids Wear', slug: 'kids', emoji: '🎀', count: 4, desc: 'Ethnic joy for little ones' },
];

const featured = PRODUCTS.filter(p => p.badge === 'Bestseller' || p.badge === 'New' || p.badge === 'Premium').slice(0, 4);

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="hero__inner">
          <p className="hero__eyebrow">New Festive Collection 2026</p>
          <h1>Where Tradition<br />Meets Style</h1>
          <p className="hero__sub">Handpicked ethnic wear from master weavers and artisans across India, delivered to your doorstep.</p>
          <div className="hero__cta">
            <a href="/collections" className="btn btn--light">Shop Collections</a>
            <a href="/collections/sarees" className="btn btn--outline" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>Explore Sarees</a>
          </div>
        </div>
        <div className="hero__scroll">↓ &nbsp; Scroll to discover</div>
      </section>

      {/* USP Strip */}
      <div className="usp-strip">
        <div className="container">
          <div className="usp-strip__grid">
            {[['🚚','Free Shipping','On orders above ₹2,500'],['✅','100% Authentic','Directly from artisans'],['↩️','Easy Returns','15-day hassle-free returns'],['🔒','Secure Payment','Razorpay & Stripe secured']].map(([icon,title,sub]) => (
              <div key={title} className="usp-item">
                <div className="usp-item__icon">{icon}</div>
                <div className="usp-item__title">{title}</div>
                <div className="usp-item__sub">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collections */}
      <section className="section" style={{ background: 'var(--color-bg)' }}>
        <div className="container">
          <div className="section-header">
            <p className="section-header__eyebrow">Browse by Category</p>
            <h2>Our Collections</h2>
            <p>From bridal lehengas to everyday kurtas — find your perfect ethnic look</p>
          </div>
          <div className="grid-4">
            {COLLECTIONS.map(c => (
              <a key={c.slug} href={`/collections/${c.slug}`} className="collection-card">
                <div className="collection-card__bg">{c.emoji}</div>
                <div className="collection-card__overlay" />
                <div className="collection-card__body">
                  <div className="collection-card__label">Explore</div>
                  <div className="collection-card__name">{c.name}</div>
                  <div className="collection-card__count">{c.count} styles available</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section" style={{ background: 'var(--color-surface)' }}>
        <div className="container">
          <div className="section-header">
            <p className="section-header__eyebrow">Handpicked for You</p>
            <h2>Featured Pieces</h2>
            <p>Bestsellers and new arrivals loved by our community</p>
          </div>
          <div className="grid-4">
            {featured.map(p => <ProductCard key={p.id} {...p} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <a href="/collections" className="btn btn--outline">View All Products</a>
          </div>
        </div>
      </section>

      {/* Brand story */}
      <section className="section" style={{ background: 'linear-gradient(135deg,#1a0a10,#3d1020)', color: '#fff' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily:'system-ui', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--color-accent)', marginBottom:'1rem' }}>Our Story</p>
            <h2 style={{ color:'#fff', marginBottom:'1rem' }}>Rooted in Indian Craft Traditions</h2>
            <p style={{ color:'rgba(255,255,255,0.7)', fontFamily:'system-ui', marginBottom:'1.5rem', lineHeight:1.8 }}>Each piece in our collection tells a story — of master weavers in Varanasi, block printers in Jaipur, and embroiderers in Lucknow. We work directly with artisans to bring you authentic Indian textiles at honest prices.</p>
            <a href="/collections" className="btn btn--light">Discover the Collection</a>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {[['150+','Artisan Partners'],['12','Indian States'],['5000+','Happy Customers'],['100%','Handcrafted']].map(([num,label]) => (
              <div key={label} style={{ background:'rgba(255,255,255,0.07)', borderRadius:'var(--radius)', padding:'1.5rem', textAlign:'center' }}>
                <div style={{ fontFamily:'Georgia,serif', fontSize:'2rem', color:'var(--color-accent)', marginBottom:'0.3rem' }}>{num}</div>
                <div style={{ fontFamily:'system-ui', fontSize:'0.8rem', color:'rgba(255,255,255,0.6)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <div className="newsletter">
        <div className="container">
          <h2>Get Early Access to New Arrivals</h2>
          <p>Join 5,000+ fashion lovers. No spam, only curated drops.</p>
          <div className="newsletter__form">
            <input className="newsletter__input" type="email" placeholder="Enter your email" />
            <button className="btn btn--primary">Subscribe</button>
          </div>
        </div>
      </div>
    </main>
  );
}
