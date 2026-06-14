'use client';
import { useCart } from '../../context/CartContext';
import { useEffect, useState } from 'react';
import { formatAUD } from '../../lib/products';

type Variant = { id: string; size: string; stock_count: number };
type StockMap = Record<string, number>;

function variantKey(productId: string, size?: string) {
  return size ? `${productId}__${size}` : productId;
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const [stockMap, setStockMap] = useState<StockMap>({});

  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const uniqueProductIds = Array.from(new Set(items.map(i => i.id)));
    Promise.all(
      uniqueProductIds.map(pid =>
        fetch(`/api/variants/${pid}`)
          .then(r => r.json())
          .then((variants: Variant[]) => ({ pid, variants }))
          .catch(() => ({ pid, variants: [] as Variant[] }))
      )
    ).then(results => {
      const map: StockMap = {};
      for (const { pid, variants } of results) {
        for (const v of variants) {
          map[variantKey(pid, v.size)] = v.stock_count;
        }
        if (variants.length === 1) map[pid] = variants[0].stock_count;
      }
      setStockMap(map);
    });
  }, [isOpen, items]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCart]);

  return (
    <>
      <div
        className={`cart-overlay${isOpen ? ' open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        className={`cart-drawer${isOpen ? ' open' : ''}`}
        aria-label="Shopping cart"
        role="dialog"
        aria-modal="true"
      >
        <div className="cart-drawer__header">
          <div className="cart-drawer__title">
            🛍️ Your Bag
            {totalItems > 0 && (
              <span className="cart-drawer__count">{totalItems}</span>
            )}
          </div>
          <button className="cart-drawer__close" onClick={closeCart} aria-label="Close cart">✕</button>
        </div>

        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty__icon">🛍️</div>
              <p className="cart-empty__text">Your bag is empty</p>
              <p style={{ fontSize: '.8rem' }}>Add something beautiful from our collections</p>
              <a href="/collections" className="btn btn-primary" onClick={closeCart} style={{ marginTop: 'var(--space-4)' }}>
                Shop collections
              </a>
            </div>
          ) : (
            items.map(item => {
              const size = (item as any).selectedSize as string | undefined;
              const key  = variantKey(item.id, size);
              const max  = stockMap[key] ?? stockMap[item.id] ?? 99;
              const atMax = item.quantity >= max;

              return (
                <div key={`${item.id}__${size ?? ''}`} className="cart-item">
                  <div className="cart-item__img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} className="cart-item__img" />
                      : '🥻'
                    }
                  </div>
                  <div className="cart-item__body">
                    <div className="cart-item__name">{item.name}</div>
                    <div className="cart-item__meta">
                      {size && `Size: ${size}`}
                      {item.subtitle && ` · ${item.subtitle}`}
                    </div>
                    <div className="cart-item__price">{formatAUD(item.price * item.quantity)}</div>
                    <div className="cart-item__actions">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item.id, size, item.quantity - 1)}
                        aria-label="Decrease"
                      >−</button>
                      <span className="cart-qty-val">{item.quantity}</span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => { if (!atMax) updateQuantity(item.id, size, item.quantity + 1); }}
                        aria-label="Increase"
                        disabled={atMax}
                        title={atMax ? `Only ${max} in stock` : undefined}
                        style={{ opacity: atMax ? 0.35 : 1, cursor: atMax ? 'not-allowed' : 'pointer' }}
                      >+</button>
                      {atMax && (
                        <span style={{ fontSize: '.68rem', color: '#dc2626', fontWeight: 600, marginLeft: '.25rem' }}>
                          Max {max}
                        </span>
                      )}
                      <button
                        className="cart-remove-btn"
                        onClick={() => removeItem(item.id, size)}
                      >Remove</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatAUD(totalPrice)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>{totalPrice >= 150 ? '✅ Free' : `Add ${formatAUD(150 - totalPrice)} more`}</span>
            </div>
            <div className="cart-summary-row total">
              <span>Total</span>
              <span>{formatAUD(totalPrice)}</span>
            </div>
            <a
              href="/checkout"
              className="cart-checkout-btn"
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
            >
              Proceed to Checkout →
            </a>
            <button className="cart-continue-btn" onClick={closeCart}>
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
