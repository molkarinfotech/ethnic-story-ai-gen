'use client';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { Product } from '../../lib/products';
import { SizeSelector } from './SizeSelector';

export function AddToCartSection({ product }: { product: Product & { id: string } }) {
  const { addItem, openCart } = useCart();
  const [size, setSize]               = useState<string | null>(null);
  const [colour, setColour]           = useState<string>('');
  const [sizeInStock, setSizeInStock] = useState(true);
  const [maxQty, setMaxQty]           = useState<number>(99);
  const [qty, setQty]                 = useState(1);
  const [error, setError]             = useState(false);
  const [added, setAdded]             = useState(false);

  function handleSizeChange(selected: string | null, inStock: boolean, stockCount: number, selectedColour: string) {
    setSize(selected);
    setColour(selectedColour);
    setSizeInStock(inStock);
    setMaxQty(stockCount);
    setQty(1);
    setError(false);
  }

  function handleAdd() {
    if (!size) { setError(true); return; }
    if (!sizeInStock) return;
    const safeQty = Math.min(qty, maxQty);
    for (let i = 0; i < safeQty; i++) {
      addItem({ ...product, selectedSize: size, selectedColour: colour } as any);
    }
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  }

  const outOfStock = size !== null && !sizeInStock;
  const atMax      = size !== null && qty >= maxQty;

  return (
    <div className="pdp-atc">
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
            aria-label="Increase"
            disabled={atMax || !size}
            title={atMax ? `Only ${maxQty} in stock` : !size ? 'Select a size first' : undefined}
            style={{ opacity: (atMax || !size) ? 0.35 : 1, cursor: (atMax || !size) ? 'not-allowed' : 'pointer' }}
          >+</button>
        </div>
        {atMax && (
          <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626', fontWeight: 600, marginLeft: 'var(--space-3)' }}>Max {maxQty} available</span>
        )}
      </div>

      <button
        className={`btn btn-primary pdp-atc-btn${added ? ' pdp-atc-btn--added' : ''}`}
        onClick={handleAdd}
        disabled={outOfStock}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)', opacity: outOfStock ? 0.5 : 1 }}
      >
        {added ? '✓ Added to Bag' : outOfStock ? 'Out of Stock' : 'Add to Bag'}
      </button>

      <a href="/checkout" className="btn btn--outline" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-3)' }}>
        Buy Now
      </a>
    </div>
  );
}
