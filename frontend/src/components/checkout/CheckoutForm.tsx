'use client';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';

type Field = { label: string; id: string; type?: string; placeholder?: string; half?: boolean };

const CONTACT_FIELDS: Field[] = [
  { label: 'Full name', id: 'name', placeholder: 'Jane Doe' },
  { label: 'Email', id: 'email', type: 'email', placeholder: 'jane@example.com' },
  { label: 'Phone', id: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
];
const ADDRESS_FIELDS: Field[] = [
  { label: 'Address line 1', id: 'addr1', placeholder: '12 MG Road' },
  { label: 'Address line 2', id: 'addr2', placeholder: 'Apartment, suite, etc. (optional)' },
  { label: 'City', id: 'city', placeholder: 'Mumbai', half: true },
  { label: 'Postcode', id: 'pin', placeholder: '400001', half: true },
  { label: 'State', id: 'state', placeholder: 'Maharashtra', half: true },
  { label: 'Country', id: 'country', placeholder: 'India', half: true },
];

export function CheckoutForm() {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const shipping = totalPrice >= 2500 ? 0 : 199;
  const grandTotal = totalPrice + shipping;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    clearCart();
  }

  if (submitted) {
    return (
      <div className="order-success">
        <div className="order-success__icon">🎊</div>
        <h2>Order placed successfully!</h2>
        <p>Thank you for shopping with Vastra House. You’ll receive a confirmation email shortly.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }}>Continue shopping</a>
      </div>
    );
  }

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

  return (
    <div className="checkout-grid">
      {/* Form */}
      <form className="checkout-form" onSubmit={handleSubmit}>
        <h2 className="checkout-section-title">Contact information</h2>
        <div className="checkout-fields">
          {CONTACT_FIELDS.map(f => (
            <div key={f.id} className="checkout-field">
              <label htmlFor={f.id} className="checkout-label">{f.label}</label>
              <input id={f.id} type={f.type || 'text'} placeholder={f.placeholder} className="checkout-input" required />
            </div>
          ))}
        </div>

        <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Shipping address</h2>
        <div className="checkout-fields checkout-fields--halves">
          {ADDRESS_FIELDS.map(f => (
            <div key={f.id} className={`checkout-field${f.half ? ' checkout-field--half' : ''}`}>
              <label htmlFor={f.id} className="checkout-label">{f.label}</label>
              <input id={f.id} type="text" placeholder={f.placeholder} className="checkout-input" required={f.id !== 'addr2'} />
            </div>
          ))}
        </div>

        <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Payment</h2>
        <div className="checkout-payment-note">
          <span>🔒</span>
          <p>Payment integration (Razorpay / Stripe) will be connected in the next step. For now, place a test order.</p>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)', minHeight: '52px', fontSize: 'var(--text-base)' }}>
          Place Order &mdash; ₹{grandTotal.toLocaleString('en-IN')}
        </button>
      </form>

      {/* Order Summary */}
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
              <div className="order-item__price">₹{(item.priceInr * item.quantity).toLocaleString('en-IN')}</div>
            </li>
          ))}
        </ul>
        <div className="order-totals">
          <div className="order-total-row">
            <span>Subtotal</span>
            <span>₹{totalPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="order-total-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? <span style={{ color: 'green' }}>Free</span> : `₹${shipping}`}</span>
          </div>
          <div className="order-total-row order-total-row--grand">
            <strong>Total</strong>
            <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
          </div>
        </div>
        <div className="order-trust">
          {['🔒 Secure checkout', '↩️ 15-day returns', '✅ Authentic products'].map(t => (
            <span key={t} className="order-trust-item">{t}</span>
          ))}
        </div>
      </aside>
    </div>
  );
}
