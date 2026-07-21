import { ProductCard } from '../components/shop/ProductCard';
import { getProducts } from '../lib/fetchProducts';

export const revalidate = 60;

export default async function HomePage() {
  const products = await getProducts();
  const featured = products
    .filter(p => p.badge === 'Bestseller' || p.badge === 'New' || p.badge === 'Premium')
    .slice(0, 4);

  return (
    <main>
      {/* Hero */}
      <section className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-copy" data-reveal>
            <span className="pill">Indian Ethnic Wear · Women &amp; Festive Edit</span>
            <h1>Draped in tradition, styled for today.</h1>
            <p>A curated collection of sarees, lehengas, kurtas, and festive sets — rooted in Indian craft, designed for modern celebrations.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/collections">Explore collections</a>
              <a className="btn btn-secondary" href="#craft">Our signature look</a>
            </div>
          </div>
          <div className="hero-side">
            <article className="visual-card" data-reveal>
              <div className="pattern" aria-hidden="true"></div>
              <div className="visual-frame">
                <div className="visual-label">
                  <span className="pill" style={{ background: 'rgba(255,248,243,.18)', color: '#fff8f3' }}>Festive Drop</span>
                  <strong>Wedding silhouettes with a lighter, more modern attitude.</strong>
                </div>
              </div>
            </article>
            <div className="mini-stack">
              <article className="mini-card" data-reveal>
                <h3>Colour story</h3>
                <p>Plum, sindoor, antique gold, ivory, and rose clay — rooted in Indian festive cues, refined for modern luxury.</p>
                <div className="swatch-row" aria-hidden="true">
                  <span className="swatch" style={{ background: '#6c2340' }}></span>
                  <span className="swatch" style={{ background: '#b88332' }}></span>
                  <span className="swatch" style={{ background: '#d8b07a' }}></span>
                  <span className="swatch" style={{ background: '#f3dfc4' }}></span>
                </div>
              </article>
              <article className="mini-card" data-reveal>
                <h3>New arrivals</h3>
                <p>Handpicked styles for the season — ready to wear, easy to style, and crafted to be remembered.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* USP Strip — text-only, no emoji */}
      <div className="usp-strip">
        <div className="container">
          <div className="usp-strip__grid">
            {[
              ['Free Shipping', 'On orders above ₹2,500'],
              ['100% Authentic', 'Directly from artisans'],
              ['Easy Returns', '15-day hassle-free returns'],
              ['Secure Payment', 'Razorpay & Stripe secured'],
            ].map(([title, sub]) => (
              <div key={String(title)} className="usp-item">
                <div className="usp-item__title">{title}</div>
                <div className="usp-item__sub">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collections */}
      <section className="section" id="collections">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <span className="pill">Collections</span>
              <h2>Dressed for every occasion.</h2>
            </div>
            <p>From grand celebrations to relaxed festivities — explore looks crafted to feel as beautiful as the moments they belong to.</p>
          </div>
          <div className="collections-grid">
            <article className="collection-card" data-reveal>
              <div className="bg one"></div><div className="ornament"></div>
              <div className="collection-content">
                <span>Bridal &amp; Occasion</span>
                <h3><a href="/collections/lehengas" style={{color:'inherit'}}>Lehengas with contemporary tailoring.</a></h3>
              </div>
            </article>
            <article className="collection-card" data-reveal>
              <div className="bg two"></div><div className="ornament"></div>
              <div className="collection-content">
                <span>Everyday Luxe</span>
                <h3><a href="/collections/kurtas" style={{color:'inherit'}}>Kurta sets that move with you.</a></h3>
              </div>
            </article>
            <article className="collection-card" data-reveal>
              <div className="bg three"></div><div className="ornament"></div>
              <div className="collection-content">
                <span>Signature Drapes</span>
                <h3><a href="/collections/sarees" style={{color:'inherit'}}>Sarees with rich borders and soft structure.</a></h3>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section" style={{ background: 'var(--color-surface)' }}>
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <span className="pill">Handpicked for You</span>
              <h2>Featured pieces.</h2>
            </div>
            <p>Bestsellers and new arrivals loved by our community.</p>
          </div>
          <div className="grid-4">
            {featured.map(p => <ProductCard key={p.id} {...p} originalPrice={p.original_price ?? p.originalPrice} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <a href="/collections" className="btn btn--outline">View all products</a>
          </div>
        </div>
      </section>

      {/* Story + Features */}
      <section className="section" id="craft">
        <div className="container story-grid">
          <article className="story-card" data-reveal>
            <span className="pill">Our story</span>
            <h2 style={{ marginTop: 'var(--space-4)' }}>Heritage cloth, worn by those who live fully in the present.</h2>
            <p style={{ marginTop: 'var(--space-4)' }}>Every piece carries a thread of tradition — block prints, hand embroidery, natural dyes — paired with silhouettes that breathe and move with you.</p>
            <div className="metrics">
              <div className="metric"><strong>200+</strong><span>Curated styles</span></div>
              <div className="metric"><strong>12</strong><span>Artisan regions</span></div>
              <div className="metric"><strong>100%</strong><span>Made in India</span></div>
            </div>
          </article>
          <div className="feature-list">
            <article className="feature-card" data-reveal>
              <small>Fabric first</small>
              <h3>Handloom, silk, and natural weaves</h3>
              <p>We source directly from artisans — Banarasi, Chanderi, Kanjivaram — so every fabric has provenance.</p>
            </article>
            <article className="feature-card" data-reveal>
              <small>Styled for real life</small>
              <h3>Outfits curated for the full season</h3>
              <p>Mehendi, sangeet, reception, puja, and gifting — we help you plan the look for each moment.</p>
            </article>
            <article className="feature-card" data-reveal>
              <small>Personal service</small>
              <h3>One-to-one styling appointments</h3>
              <p>Book a virtual or in-store session with our stylist to find the right fit, colour, and occasion match.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Services — asymmetric layout, not a uniform 4-col grid */}
      <section className="section" id="services" style={{ background: 'var(--color-surface)' }}>
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <span className="pill">How we serve you</span>
              <h2>More than a store.</h2>
            </div>
            <p>We are here from the first browse to the final stitch.</p>
          </div>
          <div className="services-bento">
            <article className="service-tile service-tile--wide" data-reveal>
              <span className="service-tile__label">Virtual styling</span>
              <h3>Assisted shopping for bridal, festive, or gifting selections.</h3>
              <a href="/contact" className="service-tile__link">Book a session →</a>
            </article>
            <article className="service-tile" data-reveal>
              <span className="service-tile__label">Custom tailoring</span>
              <h3>Measurements, alterations, and custom orders handled with care.</h3>
            </article>
            <article className="service-tile" data-reveal>
              <span className="service-tile__label">Occasion curation</span>
              <h3>Grouped edits for weddings, sangeet, puja, and reception looks.</h3>
            </article>
            <article className="service-tile service-tile--accent" data-reveal>
              <span className="service-tile__label">Worldwide shipping</span>
              <h3>We ship to Australia, UK, USA, Canada, and the Middle East.</h3>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
