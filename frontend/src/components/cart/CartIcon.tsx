'use client';
import { useCart } from '../../context/CartContext';

export function CartIcon() {
  const { totalItems, openCart } = useCart();
  return (
    <button className="icon-btn cart-icon-btn" onClick={openCart} aria-label={`Open cart, ${totalItems} items`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      {totalItems > 0 && (
        <span className="cart-badge" aria-hidden="true">{totalItems > 9 ? '9+' : totalItems}</span>
      )}
    </button>
  );
}
