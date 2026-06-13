'use client';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { Product } from '../../lib/products';
import { SizeSelector } from './SizeSelector';

export function AddToCartSection({ product }: { product: Product & { id: string } }) {
  const { addItem, openCart } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [sizeInStock, setSizeInStock] = useState(true);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);

  function handleSizeChange(selected: string | null, inStock: boolean) {
    setSize(selected);
    setSizeInStock(inStock);
    setError(false);
  }

  function handleAdd() {
    if (!size) { setError(true); return; }
    if (!sizeInStock) return;
    for (let i = 0; i < qty; i++) addItem({ ...product, selectedSize: size });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  }

  const outOfStock = size !== null && !sizeInStock;

  return (
    <div className="pdp-atc">
      {/* Live size selector driven by admin inventory */}
      <SizeSelector productId={product.id} onSizeChange={handleSizeChange} />
      {error && !size && (
        <p style={{ color: '#dc2626', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>Please select a size</p>
      )}

      <div className="pdp-qty-row" style={{ marginTop: 'var(--space-5)' }}>
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
        disabled={outOfStock}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)', opacity: outOfStock ? 0.5 : 1 }}
      >
        {added ? '✓ Added to Bag' : outOfStock ? 'Out of Stock' : 'Add to Bag'}
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
