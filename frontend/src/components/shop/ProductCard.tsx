'use client';
import { useEffect, useRef, useState } from 'react';
import { Product, formatAUD } from '../../lib/products';
import { useCart } from '../../context/CartContext';
import { LikeButton } from './LikeButton';

type Variant = { id: string; size: string; colour: string; stock_count: number };

function uniqueColours(variants: Variant[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    if (v.colour && !seen.has(v.colour)) { seen.add(v.colour); out.push(v.colour); }
  }
  return out;
}

function normaliseImageList(prod: any, fallback?: string | null): string[] {
  const ordered = [
    prod?.image,
    ...(Array.isArray(prod?.images) ? prod.images : []),
    fallback,
  ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  return Array.from(new Set(ordered));
}

export function ProductCard({ id, slug, name, subtitle, price, originalPrice, badge, image, category }: Product & { images?: string[] }) {
  const { addItem }                     = useCart();
  const [allVariants, setAllVariants]   = useState<Variant[]>([]);
  const [variants, setVariants]         = useState<Variant[]>([]);
  const [selectedColour, setColour]     = useState<string>('');
  const [selectedSize, setSize]         = useState<string>('');
  const [qty, setQty]                   = useState(1);
  const [expanded, setExpanded]         = useState(false);
  const [added, setAdded]               = useState(false);
  const [loading, setLoading]           = useState(false);
  const [stockLoaded, setStockLoaded]   = useState(false);
  const [images, setImages]             = useState<string[]>(image ? [image] : []);
  const [imgIdx, setImgIdx]             = useState(0);
  const timerRef                        = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPreOrder = badge === 'Pre-Order';

  useEffect(() => {
    fetch(`/api/variants/${id}`)
      .then(r => r.json())
      .then((data: Variant[]) => {
        if (Array.isArray(data)) {
          setAllVariants(data.map(v => ({ ...v, stock_count: Number(v.stock_count) })));
        }
        setStockLoaded(true);
      })
      .catch(() => setStockLoaded(true));

    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(prod => {
        const next = normaliseImageList(prod, image);
        if (next.length > 0) { setImages(next); setImgIdx(0); }
      })
      .catch(() => {});
  }, [id, image]);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/variants/${id}`).then(r => r.json()),
      fetch(`/api/products/${id}`).then(r => r.json()).catch(() => null),
    ]).then(([varData, prodData]) => {
      const vars: Variant[] = Array.isArray(varData) ? varData.filter((v: Variant) => Number(v.stock_count) > 0) : [];
      setVariants(vars);
      const firstColour = vars.find(v => v.colour)?.colour ?? '';
      setColour(firstColour);
      const next = normaliseImageList(prodData, image);
      if (next.length > 0) { setImages(next); setImgIdx(0); }
    }).catch(() => setVariants([])).finally(() => setLoading(false));
  }, [expanded, id, image]);

  function startCycle() {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => setImgIdx(i => (i + 1) % images.length), 1200);
  }
  function stopCycle() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setImgIdx(0);
  }
  useEffect(() => () => stopCycle(), []);

  function handleAddClick(e: React.MouseEvent) {
    e.preventDefault();
    if (stockLoaded && totallyOutOfStock) return;
    if (!expanded) { setExpanded(true); return; }
    if (!selectedSize) return;
    const resolvedImage = images[0] ?? image;
    addItem({ id, slug, name, subtitle, price, originalPrice, badge, image: resolvedImage, category, selectedSize, selectedColour } as any);
    for (let i = 1; i < qty; i++) addItem({ id, slug, name, subtitle, price, originalPrice, badge, image: resolvedImage, category, selectedSize, selectedColour } as any);
    setAdded(true);
    setExpanded(false);
    setSize('');
    setColour('');
    setQty(1);
    setTimeout(() => setAdded(false), 1600);
  }

  const colours = uniqueColours(variants);
  const hasColours = colours.length > 0;
  const filteredVariants = hasColours ? variants.filter(v => v.colour === selectedColour) : variants;
  const inStock = variants.some(v => v.stock_count > 0);
  const selectedVariant = filteredVariants.find(v => v.size === selectedSize);
  const maxQty = selectedVariant?.stock_count ?? 10;
  const currentImage = images[imgIdx] ?? image;
  const totallyOutOfStock = stockLoaded && allVariants.length > 0 && allVariants.every(v => v.stock_count === 0);
  const noVariants = stockLoaded && allVariants.length === 0;
  const isOOS = totallyOutOfStock || noVariants;

  return (
    <div className="product-card" style={{ position: 'relative' }} onMouseEnter={startCycle} onMouseLeave={stopCycle}>
      <a href={`/products/${slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div className="product-card__image" style={{ position: 'relative', overflow: 'hidden' }}>
          {currentImage
            ? <img src={currentImage} alt={name} loading="lazy" style={{ transition: 'opacity .3s', width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '4rem' }}>🥻</span>}
          {badge && <span className="product-card__badge">{badge}</span>}
          {isOOS && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.92)', color: '#dc2626', fontWeight: 700, fontSize: '.75rem', letterSpacing: '.06em', textTransform: 'uppercase', padding: '.35rem .8rem', borderRadius: '.4rem', border: '1px solid #fca5a5' }}>Out of Stock</span>
            </div>
          )}
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
              {images.map((_, i) => (
                <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === imgIdx ? 'white' : 'rgba(255,255,255,.5)', display: 'inline-block', transition: 'background .2s' }} />
              ))}
            </div>
          )}
        </div>
        <div className="product-card__body">
          <div className="product-card__name">{name}</div>
          {subtitle && <div className="product-card__sub">{subtitle}</div>}
          <div className="product-card__price">
            {formatAUD(price)}
            {originalPrice && <s>{formatAUD(originalPrice)}</s>}
          </div>
          {isPreOrder && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '.35rem', marginTop: '.45rem',
              background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '.45rem', padding: '.4rem .55rem',
            }}>
              <span style={{ fontSize: '.75rem', flexShrink: 0, marginTop: '.05rem' }}>⚠️</span>
              <p style={{ fontSize: '.68rem', color: '#dc2626', lineHeight: 1.45, margin: 0, maxWidth: '100%' }}>
                Not available locally. Ships from India — allow <strong>2–4 weeks</strong> delivery.
              </p>
            </div>
          )}
        </div>
      </a>

      <div style={{ padding: '0 1rem 1rem' }}>
        {expanded && !isOOS && (
          <div style={{ marginBottom: '.6rem' }}>
            {loading ? (
              <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', margin: '.25rem 0' }}>Loading…</p>
            ) : variants.length === 0 ? (
              <p style={{ fontSize: '.75rem', color: '#dc2626', margin: '.25rem 0' }}>Out of stock</p>
            ) : (
              <>
                {hasColours && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginBottom: '.5rem' }}>
                    <span style={{ fontSize: '.7rem', color: 'var(--color-text-muted)', fontWeight: 600, alignSelf: 'center', marginRight: '.2rem' }}>Colour:</span>
                    {colours.map(c => (
                      <button key={c} onClick={e => { e.preventDefault(); setColour(c); setSize(''); }}
                        style={{ padding: '.2rem .55rem', fontSize: '.7rem', fontWeight: 600, borderRadius: '.4rem', border: `1.5px solid ${selectedColour === c ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedColour === c ? 'var(--color-primary)' : 'white', color: selectedColour === c ? 'white' : 'var(--color-text)', cursor: 'pointer' }}>{c}</button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginBottom: '.5rem' }}>
                  {filteredVariants.map(v => (
                    <button key={v.size} onClick={e => { e.preventDefault(); setSize(v.size); }}
                      style={{ padding: '.2rem .6rem', fontSize: '.72rem', fontWeight: 600, borderRadius: '.4rem', border: `1.5px solid ${selectedSize === v.size ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedSize === v.size ? 'var(--color-primary)' : 'white', color: selectedSize === v.size ? 'white' : 'var(--color-text)', cursor: 'pointer' }}>{v.size}</button>
                  ))}
                </div>
                {selectedSize && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
                    <button onClick={e => { e.preventDefault(); setQty(q => Math.max(1, q - 1)); }} style={{ width: '26px', height: '26px', borderRadius: '.35rem', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontWeight: 700 }}>−</button>
                    <span style={{ fontSize: '.85rem', fontWeight: 600, minWidth: '1.5rem', textAlign: 'center' }}>{qty}</span>
                    <button onClick={e => { e.preventDefault(); setQty(q => Math.min(maxQty, q + 1)); }} disabled={qty >= maxQty} style={{ width: '26px', height: '26px', borderRadius: '.35rem', border: '1px solid var(--color-border)', background: 'white', cursor: qty >= maxQty ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: qty >= maxQty ? 0.35 : 1 }}>+</button>
                    <span style={{ fontSize: '.7rem', color: 'var(--color-text-muted)' }}>{maxQty} left</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button
          className={`add-to-cart-btn${added ? ' add-to-cart-btn--added' : ''}`}
          onClick={handleAddClick}
          disabled={isOOS || (expanded && (!inStock || (variants.length > 0 && !selectedSize) || (hasColours && !selectedColour)))}
          style={{ width: '100%', ...(isOOS ? { background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb', cursor: 'not-allowed' } : {}) }}
        >
          {added ? '✓ Added to Bag'
            : isOOS ? 'Out of Stock'
            : isPreOrder && !expanded ? '🛒 Pre-Order'
            : expanded && hasColours && !selectedColour ? 'Select a colour'
            : expanded && !selectedSize && variants.length > 0 ? 'Select a size'
            : expanded && variants.length === 0 && !loading ? 'Out of stock'
            : 'Add to Bag'}
        </button>

        {/* Like button — below Add to Bag on card */}
        <div style={{ marginTop: '.55rem', display: 'flex', justifyContent: 'center' }}>
          <LikeButton productId={id} />
        </div>
      </div>
    </div>
  );
}
