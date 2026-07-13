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
  const isPreOrder   = badge === 'Pre-Order';

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
            {isPreOrder && (
              <span style={{ background: '#fff7ed', color: '#c2410c', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)', border: '1px solid #fed7aa' }}>Pre-Order</span>
            )}
          </div>

          {/* ── Pre-Order disclaimer banner ─────────────────────────────── */}
          {isPreOrder && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              background: '#fff1f2',
              border: '1.5px solid #fca5a5',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4) var(--space-5)',
              marginBottom: 'var(--space-5)',
            }}>
              <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '.05rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: 'var(--text-sm)', marginBottom: '.25rem' }}>Pre-Order — Not Available Locally</div>
                <div style={{ color: '#dc2626', fontSize: 'var(--text-xs)', lineHeight: 1.55 }}>
                  This product is not currently held in local stock and is sourced directly from India.
                  Please allow <strong>2–4 weeks</strong> for delivery after your order is placed.
                </div>
              </div>
            </div>
          )}

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
                : isPreOrder    ? '🛒 Pre-Order Now'
                : 'Add to Bag'}
            </button>

            {/* Buy Now: hidden for coming soon */}
            {!isComingSoon && !globalOOS && (
              <a
                href="#"
                className="btn btn-secondary pdp-buynow-btn"
                onClick={e => { e.preventDefault(); doAdd(false); }}
                style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-3)', display: 'flex' }}
              >
                Buy Now
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
