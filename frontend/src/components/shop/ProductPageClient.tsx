'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ProductImageCarousel } from './ProductImageCarousel';
import { SizeSelector } from './SizeSelector';
import { LikeButton } from './LikeButton';
import { ReviewSection } from './ReviewSection';
import { useCart } from '../../context/CartContext';
import { formatAUD } from '../../lib/products';
import { supabase } from '../../lib/supabase';

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

  // Notify me state
  const [notifyEmail, setNotifyEmail]     = useState('');
  const [notifyStatus, setNotifyStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [notifyMessage, setNotifyMessage] = useState('');

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

  // Pre-fill notify email from logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setNotifyEmail(data.user.email);
    });
  }, []);

  // null = not yet fetched; true = product has NO variants at all (globally OOS); false = has at least one variant
  // Per-colour+size OOS is handled entirely by sizeInStock from handleSizeChange.
  const [globalOOS,    setGlobalOOS]    = useState<boolean | null>(null);
  const [stockChecked, setStockChecked] = useState(false);

  useEffect(() => {
    if (isComingSoon) { setGlobalOOS(false); setStockChecked(true); return; }
    fetch(`/api/variants/${product.id}?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((data: { stock_count: number }[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setGlobalOOS(true);
        } else {
          setGlobalOOS(false);
        }
      })
      .catch(() => {
        setGlobalOOS(false);
      })
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
    setMaxQty(stockCount > 0 ? stockCount : 0);
    setQty(1);
    setError(false);
    // Reset notify state when selection changes
    setNotifyStatus('idle');
    setNotifyMessage('');
  }, [selectedColour]);

  function doAdd(sticky = false) {
    if (isComingSoon || globalOOS === true) return;
    if (!stockChecked) return;
    if (!size) { setError(true); return; }
    if (!sizeInStock) return;
    const safeQty = Math.min(qty, maxQty);
    if (safeQty <= 0) return;
    for (let i = 0; i < safeQty; i++) {
      addItem({ ...product, selectedSize: size, selectedColour } as any);
    }
    if (sticky) { setStickyAdded(true); setTimeout(() => setStickyAdded(false), 2000); }
    else        { setAdded(true);       setTimeout(() => setAdded(false), 2000); }
    openCart();
  }

  async function doNotify() {
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!notifyEmail || !EMAIL_RE.test(notifyEmail)) {
      setNotifyMessage('Please enter a valid email address.');
      setNotifyStatus('error');
      return;
    }
    setNotifyStatus('loading');
    try {
      const res = await fetch('/api/notify-restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: notifyEmail,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
        }),
      });
      const json = await res.json();
      if (res.ok && json.subscribed) {
        setNotifyStatus('done');
        setNotifyMessage("You're on the list! We'll email you when it's back in stock.");
      } else {
        setNotifyStatus('error');
        setNotifyMessage(json.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setNotifyStatus('error');
      setNotifyMessage('Network error. Please try again.');
    }
  }

  const outOfStock = !isComingSoon && (
    globalOOS === true ||
    (size !== null && !sizeInStock)
  );
  const atMax = size !== null && qty >= maxQty && maxQty > 0;

  const atcDisabled = !stockChecked || isComingSoon || outOfStock;

  const atcLabel = () => {
    if (isComingSoon)               return '⏳ Coming Soon';
    if (!stockChecked)              return 'Checking stock…';
    if (added)                      return '✓ Added to Bag';
    if (globalOOS === true)         return '🚫 Out of Stock';
    if (size !== null && !sizeInStock) return 'Out of Stock — Select another size';
    if (isPreOrder)                 return '🛒 Pre-Order Now';
    return 'Add to Bag';
  };

  // Show notify panel when globally OOS OR when a specific size is selected and OOS
  const showNotifyPanel = !isComingSoon && stockChecked && (
    globalOOS === true || (size !== null && !sizeInStock)
  );

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
            {stockChecked && globalOOS === true && !isComingSoon && (
              <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)', border: '1px solid #fca5a5' }}>Out of Stock</span>
            )}
            {isComingSoon && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)', border: '1px solid #bfdbfe' }}>Coming Soon</span>
            )}
            {isPreOrder && (
              <span style={{ background: '#fff7ed', color: '#c2410c', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)', border: '1px solid #fed7aa' }}>Pre-Order</span>
            )}
          </div>

          {/* Pre-Order disclaimer */}
          {isPreOrder && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
              background: '#fff1f2', border: '1.5px solid #fca5a5',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-5)',
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

          {/* Global OOS banner — only shown when product has NO variants at all */}
          {stockChecked && globalOOS === true && !isComingSoon && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: 'var(--text-sm)' }}>Currently Out of Stock</div>
                <div style={{ color: '#6b7280', fontSize: 'var(--text-xs)', marginTop: '.2rem' }}>This item is unavailable right now. Enter your email below and we'll notify you the moment it's back.</div>
              </div>
            </div>
          )}

          {/* Variant selector + inline ATC */}
          <div ref={atcRef} className="pdp-atc">
            {!isComingSoon && globalOOS !== true && stockChecked && (
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
                      disabled={atMax || !size || !sizeInStock}
                      style={{ opacity: (atMax || !size || !sizeInStock) ? 0.35 : 1, cursor: (atMax || !size || !sizeInStock) ? 'not-allowed' : 'pointer' }}
                    >+</button>
                  </div>
                  {atMax && <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626', fontWeight: 600 }}>Max {maxQty} available</span>}
                </div>
              </>
            )}

            {/* Size selector is still shown even if globalOOS so user can see what sizes exist */}
            {!isComingSoon && globalOOS === true && stockChecked && (
              <SizeSelector productId={product.id} onSizeChange={handleSizeChange} />
            )}

            <button
              className={`btn btn-primary pdp-atc-btn${added ? ' pdp-atc-btn--added' : ''}`}
              onClick={() => doAdd(false)}
              disabled={atcDisabled}
              aria-disabled={atcDisabled}
              style={{
                width: '100%', justifyContent: 'center',
                marginTop: 'var(--space-4)',
                opacity: atcDisabled ? 0.55 : 1,
                cursor: atcDisabled ? 'not-allowed' : 'pointer',
                ...((isComingSoon || globalOOS === true || (size !== null && !sizeInStock)) ? { background: '#9ca3af', boxShadow: 'none' } : {}),
              }}
            >
              {atcLabel()}
            </button>

            {!isComingSoon && globalOOS !== true && stockChecked && !(size !== null && !sizeInStock) && (
              <a
                href="#"
                className="btn btn-secondary pdp-buynow-btn"
                onClick={e => { e.preventDefault(); doAdd(false); }}
                style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-3)', display: 'flex' }}
              >
                Buy Now
              </a>
            )}

            {/* ── Notify Me When In Stock ── */}
            {showNotifyPanel && (
              <div style={{
                marginTop: 'var(--space-5)',
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
              }}>
                {notifyStatus === 'done' ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>You're on the list!</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '.25rem', lineHeight: 1.5 }}>{notifyMessage}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔔</span>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>Notify me when back in stock</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'stretch' }}>
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={e => { setNotifyEmail(e.target.value); setNotifyStatus('idle'); setNotifyMessage(''); }}
                        placeholder="your@email.com"
                        aria-label="Email address for restock notification"
                        style={{
                          flex: 1,
                          padding: '.55rem var(--space-3)',
                          fontSize: 'var(--text-sm)',
                          border: `1.5px solid ${notifyStatus === 'error' ? '#fca5a5' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-bg)',
                          color: 'var(--color-text)',
                          outline: 'none',
                          minWidth: 0,
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') doNotify(); }}
                      />
                      <button
                        onClick={doNotify}
                        disabled={notifyStatus === 'loading'}
                        style={{
                          flexShrink: 0,
                          padding: '.55rem var(--space-4)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 600,
                          background: 'var(--color-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: notifyStatus === 'loading' ? 'wait' : 'pointer',
                          opacity: notifyStatus === 'loading' ? 0.7 : 1,
                          transition: 'opacity 180ms',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notifyStatus === 'loading' ? 'Saving…' : 'Notify Me'}
                      </button>
                    </div>
                    {notifyStatus === 'error' && notifyMessage && (
                      <p style={{ color: '#dc2626', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>{notifyMessage}</p>
                    )}
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                      We'll send one email when this item is restocked. No spam.
                    </p>
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center' }}>
              <LikeButton productId={product.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="pdp-reviews-wrap" style={{ maxWidth: 'var(--content-default)', margin: '0 auto', padding: '0 var(--space-4)' }}>
        <ReviewSection productId={product.id} />
      </div>
    </>
  );
}
