'use client';
import { useEffect, useState } from 'react';
import { Product, formatAUD } from '../../lib/products';
import { useCart } from '../../context/CartContext';

type Variant = { id: string; size: string; stock_count: number };

export function ProductCard({ id, slug, name, subtitle, price, originalPrice, badge, image, category }: Product) {
  const { addItem } = useCart();
  const [variants, setVariants]     = useState<Variant[]>([]);
  const [selectedSize, setSize]     = useState<string>('');
  const [qty, setQty]               = useState(1);
  const [expanded, setExpanded]     = useState(false);
  const [added, setAdded]           = useState(false);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    fetch(`/api/variants/${id}`)
      .then(r => r.json())
      .then((data: Variant[]) => {
        setVariants(Array.isArray(data) ? data.filter(v => v.stock_count > 0) : []);
      })
      .catch(() => setVariants([]))
      .finally(() => setLoading(false));
  }, [expanded, id]);

  function handleAddClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!expanded) { setExpanded(true); return; }
    if (!selectedSize) return;
    addItem({ id, slug, name, subtitle, price, originalPrice, badge, image, category, selectedSize } as any);
    for (let i = 1; i < qty; i++) addItem({ id, slug, name, subtitle, price, originalPrice, badge, image, category, selectedSize } as any);
    setAdded(true);
    setExpanded(false);
    setSize('');
    setQty(1);
    setTimeout(() => setAdded(false), 1600);
  }

  const inStock = variants.some(v => v.stock_count > 0);
  const selectedVariant = variants.find(v => v.size === selectedSize);
  const maxQty = selectedVariant?.stock_count ?? 10;

  return (
    <div className="product-card" style={{ position: 'relative' }}>
      <a href={`/products/${slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div className="product-card__image">
          {image
            ? <img src={image} alt={name} loading="lazy" />
            : <span style={{ fontSize: '4rem' }}>🥻</span>}
          {badge && <span className="product-card__badge">{badge}</span>}
        </div>
        <div className="product-card__body">
          <div className="product-card__name">{name}</div>
          {subtitle && <div className="product-card__sub">{subtitle}</div>}
          <div className="product-card__price">
            {formatAUD(price)}
            {originalPrice && <s>{formatAUD(originalPrice)}</s>}
          </div>
        </div>
      </a>

      <div style={{ padding: '0 1rem 1rem' }}>
        {/* Size + Qty picker — shown after first click */}
        {expanded && (
          <div style={{ marginBottom: '.6rem' }}>
            {loading ? (
              <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', margin: '.25rem 0' }}>Loading sizes…</p>
            ) : variants.length === 0 ? (
              <p style={{ fontSize: '.75rem', color: '#dc2626', margin: '.25rem 0' }}>Out of stock</p>
            ) : (
              <>
                {/* Size pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginBottom: '.5rem' }}>
                  {variants.map(v => (
                    <button
                      key={v.size}
                      onClick={e => { e.preventDefault(); setSize(v.size); }}
                      style={{
                        padding: '.2rem .6rem',
                        fontSize: '.72rem',
                        fontWeight: 600,
                        borderRadius: '.4rem',
                        border: `1.5px solid ${selectedSize === v.size ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: selectedSize === v.size ? 'var(--color-primary)' : 'white',
                        color: selectedSize === v.size ? 'white' : 'var(--color-text)',
                        cursor: 'pointer',
                      }}
                    >{v.size}</button>
                  ))}
                </div>

                {/* Qty stepper */}
                {selectedSize && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
                    <button onClick={e => { e.preventDefault(); setQty(q => Math.max(1, q - 1)); }}
                      style={{ width: '26px', height: '26px', borderRadius: '.35rem', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontWeight: 700 }}>−</button>
                    <span style={{ fontSize: '.85rem', fontWeight: 600, minWidth: '1.5rem', textAlign: 'center' }}>{qty}</span>
                    <button onClick={e => { e.preventDefault(); setQty(q => Math.min(maxQty, q + 1)); }}
                      style={{ width: '26px', height: '26px', borderRadius: '.35rem', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontWeight: 700 }}>+</button>
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
          disabled={expanded && (!inStock || (variants.length > 0 && !selectedSize))}
          style={{ width: '100%' }}
        >
          {added ? '✓ Added to Bag'
            : expanded && !selectedSize && variants.length > 0 ? 'Select a size'
            : expanded && variants.length === 0 && !loading ? 'Out of stock'
            : 'Add to Bag'}
        </button>
      </div>
    </div>
  );
}
