'use client';
import { useCart } from '../../context/CartContext';
import { useEffect } from 'react';

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, totalPrice } = useCart();

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`cart-backdrop${isOpen ? ' cart-backdrop--visible' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`cart-drawer${isOpen ? ' cart-drawer--open' : ''}`}
        aria-label="Shopping cart"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="cart-drawer__header">
          <div>
            <h2 className="cart-drawer__title">Your Bag</h2>
            {totalItems > 0 && (
              <span className="cart-drawer__count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            )}
          </div>
          <button className="cart-drawer__close" onClick={closeCart} aria-label="Close cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty__icon">🛍️</div>
              <p className="cart-empty__text">Your bag is empty</p>
              <p className="cart-empty__sub">Add something beautiful from our collections</p>
              <a href="/collections" className="btn btn-primary" onClick={closeCart} style={{ marginTop: 'var(--space-4)' }}>Shop collections</a>
            </div>
          ) : (
            <ul className="cart-items">
              {items.map(item => (
                <li key={item.id} className="cart-item">
                  {/* Image / placeholder */}
                  <div className="cart-item__image">
                    {item.image
                      ? <img src={item.image} alt={item.name} />
                      : <span style={{ fontSize: '1.8rem' }}>🥻</span>
                    }
                  </div>

                  {/* Details */}
                  <div className="cart-item__details">
                    <div className="cart-item__name">{item.name}</div>
                    {item.subtitle && <div className="cart-item__sub">{item.subtitle}</div>}
                    <div className="cart-item__price">₹{(item.priceInr * item.quantity).toLocaleString('en-IN')}</div>

                    {/* Qty + Remove */}
                    <div className="cart-item__actions">
                      <div className="qty-control">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >−</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >+</button>
                      </div>
                      <button
                        className="cart-item__remove"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-total">
              <span>Subtotal</span>
              <strong>₹{totalPrice.toLocaleString('en-IN')}</strong>
            </div>
            <p className="cart-shipping-note">Shipping calculated at checkout</p>
            <a href="/checkout" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
              Proceed to Checkout
            </a>
            <button
              className="cart-continue"
              onClick={closeCart}
            >
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
