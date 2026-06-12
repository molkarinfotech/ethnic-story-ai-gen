'use client';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { Product } from '../../lib/products';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function AddToCartSection({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty]   = useState(1);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (!size) { setError(true); return; }
    for (let i = 0; i < qty; i++) addItem(product);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="pdp-atc">
      <div className="pdp-size-label">
        <span>Size</span>
        {error && !size && <span className="pdp-size-error">Please select a size</span>}
      </div>
      <div className="pdp-sizes">
        {SIZES.map(s => (
          <button
            key={s}
            className={`size-btn${size === s ? ' size-btn--active' : ''}`}
            onClick={() => { setSize(s); setError(false); }}
            aria-pressed={size === s}
          >{s}</button>
        ))}
      </div>
      <div className="pdp-qty-row">
        <span className="pdp-qty-label">Quantity</span>
        <div className="qty-control">
          <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease">−</button>
          <span className="qty-value">{qty}</span>
          <button className="qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase">+</button>
        </div>
      </div>
      <button
        className={`btn btn-primary pdp-atc-btn${added ? ' pdp-atc-btn--added' : ''}`}
        onClick={handleAdd}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}
      >
        {added ? '✓ Added to Bag' : 'Add to Bag'}
      </button>
      <a
        href="/checkout"
        className="btn btn--outline"
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-3)' }}
      >
        Buy Now
      </a>
    </div>
  );
}
