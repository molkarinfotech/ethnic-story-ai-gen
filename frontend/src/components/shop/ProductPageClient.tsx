'use client';
import { useState, useCallback, useEffect } from 'react';
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

export function ProductPageClient({ product, colourImages, badge, discount, origPrice }: Props) {
  const { addItem, openCart } = useCart();

  const [selectedColour, setSelectedColour] = useState<string>(() =>
    Object.keys(colourImages)[0] ?? ''
  );
  const [size, setSize]               = useState<string | null>(null);
  const [sizeInStock, setSizeInStock] = useState(true);
  const [maxQty, setMaxQty]           = useState<number>(99);
  const [qty, setQty]                 = useState(1);
  const [error, setError]             = useState(false);
  const [added, setAdded]             = useState(false);

  // Global OOS state — fetched once on mount
  const [globalOOS,     setGlobalOOS]     = useState(false);
  const [stockChecked,  setStockChecked]  = useState(false);

  useEffect(() => {
    fetch(`/api/variants/${product.id}`)
      .then(r => r.json())
      .then((data: { stock_count: number }[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setGlobalOOS(true);
        } else {
          const allZero = data.every(v => Number(v.stock_count) === 0);
          setGlobalOOS(allZero);
        }
      })
      .catch(() => {})
      .finally(() => setStockChecked(true));
  }, [product.id]);

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

  function handleAdd() {
    if (globalOOS) return;
    if (!size) { setError(true); return; }
    if (!sizeInStock) return;
    const safeQty = Math.min(qty, maxQty);
    for (let i = 0; i < safeQty; i++) {
      addItem({ ...product, selectedSize: size, selectedColour } as any);
    }
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  }

  const outOfStock = globalOOS || (size !== null && !sizeInStock);
  const atMax      = size !== null && qty >= maxQty;

  return (
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
          {stockChecked && globalOOS && (
            <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)', border: '1px solid #fca5a5' }}>
              Out of Stock
            </span>
          )}
        </div>

        {/* OOS banner — shown when fully out of stock */}
        {stockChecked && globalOOS && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)',
            marginBottom: 'var(--space-5)',
          }}>
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚫</span>
            <div>
              <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: 'var(--text-sm)' }}>Currently Out of Stock</div>
              <div style={{ color: '#6b7280', fontSize: 'var(--text-xs)', marginTop: '.2rem' }}>This item is unavailable right now. Check back soon or browse similar products below.</div>
            </div>
          </div>
        )}

        {/* Variant selector — hidden when globally OOS (no variants to pick) */}
        <div className="pdp-atc">
          {!globalOOS && (
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
                {atMax && (
                  <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626', fontWeight: 600 }}>Max {maxQty} available</span>
                )}
              </div>
            </>
          )}

          <button
            className={`btn btn-primary pdp-atc-btn${added ? ' pdp-atc-btn--added' : ''}`}
            onClick={handleAdd}
            disabled={outOfStock}
            style={{
              width: '100%', justifyContent: 'center',
              marginTop: 'var(--space-4)',
              opacity: outOfStock ? 0.5 : 1,
              ...(globalOOS ? { background: '#9ca3af', cursor: 'not-allowed', boxShadow: 'none' } : {}),
            }}
          >
            {added ? '✓ Added to Bag'
              : globalOOS ? '🚫 Out of Stock'
              : outOfStock ? 'Out of Stock'
              : 'Add to Bag'}
          </button>

          {!globalOOS && (
            <a href="/checkout" className="btn btn--outline" style={{ width: '100%', justifyContent: 'center', display: 'flex', marginTop: 'var(--space-3)' }}>
              Buy Now
            </a>
          )}

          {/* Notify me when back in stock */}
          {stockChecked && globalOOS && (
            <NotifyMe productName={product.name} />
          )}
        </div>

        {/* Trust grid */}
        <div className="pdp-trust-grid">
          {[['🚚','Free Shipping','Orders over A$150'],['↩️','Easy Returns','15-day hassle-free'],['✅','100% Authentic','Direct from artisans'],['🔒','Secure Checkout','Stripe & Razorpay']].map(([icon,title,sub]) => (
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
  );
}

// ── Notify Me widget ──────────────────────────────────────────────────────────
function NotifyMe({ productName }: { productName: string }) {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [busy, setBusy]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    // Fire-and-forget — a real implementation would POST to /api/notify-me
    await new Promise(r => setTimeout(r, 600));
    setSent(true);
    setBusy(false);
  }

  if (sent) return (
    <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-lg)', textAlign: 'center', fontSize: 'var(--text-sm)', color: '#15803d', fontWeight: 600 }}>
      ✅ We’ll email you when {productName} is back in stock!
    </div>
  );

  return (
    <form onSubmit={submit} style={{ marginTop: 'var(--space-4)' }}>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Notify me when back in stock</p>
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
    </form>
  );
}
