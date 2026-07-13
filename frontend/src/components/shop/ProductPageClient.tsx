'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ProductImageCarousel } from './ProductImageCarousel';
import { SizeSelector } from './SizeSelector';
import { useCart } from '../../context/CartContext';
import { formatAUD } from '../../lib/products';

export type ColourImages = Record<string, string[]>;

interface Props {
  product: {
    id: string; slug: string; name: string; subtitle?: string;
    price: number; originalPrice?: number; badge?: string;
    image?: string; category: string;
  };
  colourImages: ColourImages;
  badge?: string;
  discount?: number | null;
  origPrice?: number | null;
}

const TAB_BAR_HEIGHT = 'calc(64px + env(safe-area-inset-bottom))';

export function ProductPageClient({ product, colourImages, badge, discount, origPrice }: Props) {
  const { addItem, openCart } = useCart();

  // ── Coming Soon gate ──────────────────────────────────────────────────────
  const isComingSoon = badge === 'Coming Soon';

  const [selectedColour, setSelectedColour] = useState<string>(() =>
    Object.keys(colourImages)[0] ?? ''
  );
  const [size, setSize]               = useState<string | null>(null);
  const [sizeInStock, setSizeInStock] = useState(true);
  const [maxQty, setMaxQty]           = useState<number>(99);
  const [qty, setQty]                 = useState(1);
  const [error, setError]             = useState(false);
  const [added, setAdded]             = useState(false);
  const [stickyAdded, setStickyAdded] = useState(false);

  const atcRef          = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const el = atcRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [globalOOS,    setGlobalOOS]    = useState(false);
  const [stockChecked, setStockChecked] = useState(false);

  useEffect(() => {
    if (isComingSoon) { setStockChecked(true); return; }
    fetch(`/api/variants/${product.id}`)
      .then(r => r.json())
      .then((data: { stock_count: number }[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setGlobalOOS(true);
        } else {
          setGlobalOOS(data.every(v => Number(v.stock_count) === 0));
        }
      })
      .catch(() => {})
      .finally(() => setStockChecked(true));
  }, [product.id, isComingSoon]);

  const images: string[] = (
    colourImages[selectedColour] ??
    colourImages[''] ??
    (product.image ? [product.image] : [])
  );

  const handleSizeChange = useCallback((
    sel: string | null,
    inStock: boolean,
    stockCount: number,
    colour: string,
  ) => {
    setSize(sel);
    setSelectedColour(colour || selectedColour);
    setSizeInStock(inStock);
    setMaxQty(stockCount);
    setQty(1);
    setError(false);
  }, [selectedColour]);

  function doAdd(sticky = false) {
    if (isComingSoon || globalOOS) return;
    if (!size) { setError(true); return; }
    if (!sizeInStock) return;
    const safeQty = Math.min(qty, maxQty);
    for (let i = 0; i < safeQty; i++) {
      addItem({ ...product, selectedSize: size, selectedColour } as any);
    }
    if (sticky) { setStickyAdded(true); setTimeout(() => setStickyAdded(false), 2000); }
    else        { setAdded(true);       setTimeout(() => setAdded(false), 2000); }
    openCart();
  }

  const outOfStock = !isComingSoon && (globalOOS || (size !== null && !sizeInStock));
  const atMax      = size !== null && qty >= maxQty;

  return (
    <>
      <div className="pdp-layout">
        {/* LEFT — carousel */}
        <div className="pdp-gallery-col">
          <ProductImageCarousel
            images={images}
            name={product.name}
            badge={badge}
            discount={discount}
          />

          <div className="pdp-artisan-badge">
            <span style={{ fontSize: '1.5rem' }}>✍️</span>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Handcrafted in India</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '.2rem' }}>By skilled artisans using traditional techniques</div>
            </div>
          </div>
        </div>

        {/* RIGHT — info */}
        <div className="pdp-info-col">
          <div>
            <h1 className="pdp-title-main">{product.name}</h1>
            {product.subtitle && (
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', lineHeight: 1.6 }}>{product.subtitle}</p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: 'var(--space-4) 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }} />
            <span style={{ color: 'var(--color-gold)', fontSize: '.75rem' }}>✷</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }} />
          </div>

          {/* Price row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
            <span className="pdp-price-main">{formatAUD(product.price)}</span>
            {origPrice && <s style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-faint)' }}>{formatAUD(origPrice)}</s>}
            {discount && <span style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)' }}>Save {discount}%</span>}
            {stockChecked && globalOOS && !isComingSoon && (
              <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)', border: '1px solid #fca5a5' }}>Out of Stock</span>
            )}
            {isComingSoon && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)', border: '1px solid #bfdbfe' }}>Coming Soon</span>
            )}
          </div>

          {/* Coming Soon banner */}
          {isComingSoon && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⏳</span>
              <div>
                <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 'var(--text-sm)' }}>Coming Soon</div>
                <div style={{ color: '#6b7280', fontSize: 'var(--text-xs)', marginTop: '.2rem' }}>This piece is not yet available for purchase. Check back soon or sign up below to be notified.</div>
              </div>
            </div>
          )}

          {/* OOS banner */}
          {stockChecked && globalOOS && !isComingSoon && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: 'var(--text-sm)' }}>Currently Out of Stock</div>
                <div style={{ color: '#6b7280', fontSize: 'var(--text-xs)', marginTop: '.2rem' }}>This item is unavailable right now. Check back soon or browse similar products below.</div>
              </div>
            </div>
          )}

          {/* Variant selector + inline ATC */}
          <div ref={atcRef} className="pdp-atc">
            {/* Only show size selector when NOT coming soon and NOT OOS */}
            {!isComingSoon && !globalOOS && (
              <>
                <SizeSelector productId={product.id} onSizeChange={handleSizeChange} />
                {error && !size && (
                  <p style={{ color: '#dc2626', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>Please select a size</p>
                )}
                <div className="pdp-qty-row" style={{ marginTop: 'var(--space-5)' }}>
                  <span className="pdp-qty-label">Quantity</span>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                    <span className="qty-value">{qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => { if (!atMax) setQty(q => Math.min(maxQty, q + 1)); }}
                      disabled={atMax || !size}
                      style={{ opacity: (atMax || !size) ? 0.35 : 1, cursor: (atMax || !size) ? 'not-allowed' : 'pointer' }}
                    >+</button>
                  </div>
                  {atMax && <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626', fontWeight: 600 }}>Max {maxQty} available</span>}
                </div>
              </>
            )}

            <button
              className={`btn btn-primary pdp-atc-btn${added ? ' pdp-atc-btn--added' : ''}`}
              onClick={() => doAdd(false)}
              disabled={isComingSoon || outOfStock}
              aria-disabled={isComingSoon || outOfStock}
              style={{
                width: '100%', justifyContent: 'center',
                marginTop: 'var(--space-4)',
                opacity: (isComingSoon || outOfStock) ? 0.5 : 1,
                cursor: (isComingSoon || outOfStock) ? 'not-allowed' : 'pointer',
                ...((isComingSoon || globalOOS) ? { background: '#9ca3af', boxShadow: 'none' } : {}),
              }}
            >
              {isComingSoon     ? '⏳ Coming Soon'
                : added         ? '✓ Added to Bag'
                : globalOOS     ? '🚫 Out of Stock'
                : outOfStock    ? 'Out of Stock'
                : 'Add to Bag'}
            </button>

            {/* Buy Now: hidden for coming soon */}
            {!isComingSoon && !globalOOS && (
              <a href="/checkout" className="btn btn--outline" style={{ width: '100%', justifyContent: 'center', display: 'flex', marginTop: 'var(--space-3)' }}>
                Buy Now
              </a>
            )}

            {/* Notify Me: shown for both OOS and Coming Soon */}
            {stockChecked && (globalOOS || isComingSoon) && (
              <NotifyMe
                productId={product.id}
                productName={product.name}
                productSlug={product.slug}
              />
            )}
          </div>

          {/* Trust grid */}
          <div className="pdp-trust-grid">
            {[['\ud83d\ude9a','Free Shipping','Orders over A$150'],['\u21a9️','Easy Returns','15-day hassle-free'],['\u2705','100% Authentic','Direct from artisans'],['\ud83d\udd12','Secure Checkout','Stripe & Razorpay']].map(([icon,title,sub]) => (
              <div key={title} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', marginTop: '.1rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Accordions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            {[
              { title: 'Product details', content: (
                <ul style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  <li>Care: Dry clean recommended</li>
                  <li>Origin: Made in India</li>
                  <li>SKU: {product.id.toUpperCase().slice(0, 8)}</li>
                </ul>
              )},
              { title: 'Shipping & returns', content: <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>Free standard shipping on orders over A$150. Express delivery available at checkout. Delivered Australia-wide within 5–9 business days. Returns accepted within 15 days of delivery in original, unworn condition.</p> },
            ].map(({ title, content }) => (
              <details key={title} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <summary style={{ padding: 'var(--space-4) var(--space-5)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {title}<span style={{ color: 'var(--color-gold)', fontSize: '1.1rem' }}>+</span>
                </summary>
                <div style={{ padding: '0 var(--space-5) var(--space-5)', borderTop: '1px solid var(--color-divider)' }}>
                  <div style={{ paddingTop: 'var(--space-4)' }}>{content}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky Add-to-Bag bar ── */}
      <div
        className="pdp-sticky-atc"
        style={{
          position: 'fixed',
          bottom: TAB_BAR_HEIGHT,
          left: 0,
          right: 0,
          zIndex: 101,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--color-divider)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
          padding: '.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          transform: showSticky ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
          pointerEvents: showSticky ? 'auto' : 'none',
        }}
      >
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '.5rem', flexShrink: 0, border: '1px solid var(--color-divider)' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.15rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '.9rem' }}>{formatAUD(product.price)}</span>
            {origPrice && <s style={{ fontSize: '.75rem', color: 'var(--color-text-faint)' }}>{formatAUD(origPrice)}</s>}
            {size && !isComingSoon && <span style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)', borderRadius: '.3rem', padding: '.1rem .4rem', fontSize: '.68rem', fontWeight: 700 }}>{size}</span>}
            {isComingSoon && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: '.3rem', padding: '.1rem .4rem', fontSize: '.68rem', fontWeight: 700 }}>Coming Soon</span>}
          </div>
        </div>
        <button
          onClick={() => doAdd(true)}
          disabled={isComingSoon || outOfStock}
          aria-disabled={isComingSoon || outOfStock}
          style={{
            flexShrink: 0,
            padding: '.7rem 1.4rem',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: (isComingSoon || outOfStock) ? '#9ca3af' : 'var(--color-primary)',
            color: 'white',
            fontWeight: 700,
            fontSize: '.88rem',
            cursor: (isComingSoon || outOfStock) ? 'not-allowed' : 'pointer',
            transition: 'background .2s',
            whiteSpace: 'nowrap',
            boxShadow: (isComingSoon || outOfStock) ? 'none' : '0 4px 14px rgba(157,23,77,0.35)',
          }}
        >
          {isComingSoon    ? '⏳ Coming Soon'
            : stickyAdded ? '✓ Added!'
            : globalOOS    ? '🚫 Out of Stock'
            : outOfStock   ? 'Out of Stock'
            : '🛒 Add to Bag'}
        </button>
      </div>
    </>
  );
}

// ── Notify Me widget — wired to /api/notify-restock ─────────────────────────────────────────────
function NotifyMe({ productId, productName, productSlug }: { productId: string; productName: string; productSlug: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/notify-restock', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, productId, productName, productSlug }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSent(true);
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) return (
    <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-lg)', textAlign: 'center', fontSize: 'var(--text-sm)', color: '#15803d', fontWeight: 600 }}>
      ✅ We'll email you when <strong>{productName}</strong> is back in stock!
    </div>
  );

  return (
    <form onSubmit={submit} style={{ marginTop: 'var(--space-4)' }}>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>🔔 Notify me when available</p>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com" required
          style={{ flex: 1, padding: '.65rem 1rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', outline: 'none', background: 'var(--color-bg)', boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={busy}
          style={{ padding: '.65rem 1.1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .7 : 1, whiteSpace: 'nowrap' }}>
          {busy ? '…' : 'Notify me'}
        </button>
      </div>
      {err && <p style={{ color: '#dc2626', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>{err}</p>}
    </form>
  );
}
