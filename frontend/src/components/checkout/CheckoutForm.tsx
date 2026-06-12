'use client';
import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { formatAUD } from '../../lib/products';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

export function CheckoutForm() {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [stateVal, setStateVal] = useState('');
  // Wait for localStorage hydration before deciding if cart is empty
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // CartContext hydrates in its own useEffect — we just need one tick after mount
    const timer = setTimeout(() => setHydrated(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const shipping = totalPrice >= 150 ? 0 : 12.95;
  const grandTotal = totalPrice + shipping;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    clearCart();
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="order-success">
        <div className="order-success__icon">🎊</div>
        <h2>Order placed successfully!</h2>
        <p>Thank you for shopping with Ethnic Story. You’ll receive a confirmation email shortly.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }}>Continue shopping</a>
      </div>
    );
  }

  // ── Loading skeleton while hydrating ──
  if (!hydrated) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>
        Loading your bag…
      </div>
    );
  }

  // ── Empty bag (only shown AFTER hydration) ──
  if (totalItems === 0) {
    return (
      <div className="order-success">
        <div className="order-success__icon">🛍️</div>
        <h2>Your bag is empty</h2>
        <p>Add some beautiful pieces before checking out.</p>
        <a href="/collections" className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }}>Shop collections</a>
      </div>
    );
  }

  // ── Checkout form ──
  return (
    <div className="checkout-grid">
      {/* ── Form ── */}
      <form className="checkout-form" onSubmit={handleSubmit}>

        <h2 className="checkout-section-title">Contact information</h2>
        <div className="checkout-fields">
          <div className="checkout-field">
            <label htmlFor="co-name" className="checkout-label">Full name</label>
            <input id="co-name" type="text" placeholder="Jane Smith" className="checkout-input" required />
          </div>
          <div className="checkout-field">
            <label htmlFor="co-email" className="checkout-label">Email address</label>
            <input id="co-email" type="email" placeholder="jane@example.com.au" className="checkout-input" required />
          </div>
          <div className="checkout-field">
            <label htmlFor="co-phone" className="checkout-label">Mobile number</label>
            <input id="co-phone" type="tel" placeholder="04XX XXX XXX" className="checkout-input" required />
          </div>
        </div>

        <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Shipping address</h2>
        <div className="checkout-fields checkout-fields--halves">
          <div className="checkout-field">
            <label htmlFor="co-addr1" className="checkout-label">Street address</label>
            <input id="co-addr1" type="text" placeholder="12 Collins Street" className="checkout-input" required />
          </div>
          <div className="checkout-field">
            <label htmlFor="co-addr2" className="checkout-label">Apartment / unit (optional)</label>
            <input id="co-addr2" type="text" placeholder="Unit 4" className="checkout-input" />
          </div>
          <div className="checkout-field checkout-field--half">
            <label htmlFor="co-suburb" className="checkout-label">Suburb</label>
            <input id="co-suburb" type="text" placeholder="Melbourne" className="checkout-input" required />
          </div>
          <div className="checkout-field checkout-field--half">
            <label htmlFor="co-state" className="checkout-label">State / Territory</label>
            <select
              id="co-state" className="checkout-input" required
              value={stateVal} onChange={e => setStateVal(e.target.value)}
            >
              <option value="">Select state…</option>
              {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="checkout-field checkout-field--half">
            <label htmlFor="co-postcode" className="checkout-label">Postcode</label>
            <input id="co-postcode" type="text" placeholder="3000" maxLength={4} pattern="[0-9]{4}" className="checkout-input" required />
          </div>
          <div className="checkout-field checkout-field--half">
            <label htmlFor="co-country" className="checkout-label">Country</label>
            <input id="co-country" type="text" value="Australia" readOnly className="checkout-input"
              style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }} />
          </div>
        </div>

        <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Payment</h2>
        <div className="checkout-payment-note">
          <span>🔒</span>
          <p>Payment integration (Stripe / Afterpay) will be connected in the next step. For now, place a test order.</p>
        </div>

        <button
          type="submit" className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)', minHeight: '52px', fontSize: 'var(--text-base)' }}
        >
          Place Order — {formatAUD(grandTotal)}
        </button>
      </form>

      {/* ── Order Summary ── */}
      <aside className="order-summary">
        <h2 className="checkout-section-title">Order summary</h2>
        <ul className="order-items">
          {items.map(item => (
            <li key={item.id} className="order-item">
              <div className="order-item__image">
                {item.image ? <img src={item.image} alt={item.name} /> : <span>🥻</span>}
                <span className="order-item__qty">{item.quantity}</span>
              </div>
              <div className="order-item__details">
                <div className="order-item__name">{item.name}</div>
                {item.subtitle && <div className="order-item__sub">{item.subtitle}</div>}
              </div>
              <div className="order-item__price">{formatAUD(item.price * item.quantity)}</div>
            </li>
          ))}
        </ul>
        <div className="order-totals">
          <div className="order-total-row">
            <span>Subtotal</span><span>{formatAUD(totalPrice)}</span>
          </div>
          <div className="order-total-row">
            <span>Shipping</span>
            <span>
              {shipping === 0
                ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Free</span>
                : formatAUD(shipping)
              }
            </span>
          </div>
          {shipping > 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '-.5rem' }}>
              Add {formatAUD(150 - totalPrice)} more for free shipping
            </p>
          )}
          <div className="order-total-row order-total-row--grand">
            <strong>Total (AUD)</strong>
            <strong>{formatAUD(grandTotal)}</strong>
          </div>
        </div>
        <div className="order-trust">
          {['🔒 Secure checkout', '↩️ 15-day returns', '🚚 Australia-wide delivery', '✅ Authentic products'].map(t => (
            <span key={t} className="order-trust-item">{t}</span>
          ))}
        </div>
      </aside>
    </div>
  );
}
