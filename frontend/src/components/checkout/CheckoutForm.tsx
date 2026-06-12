'use client';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCart } from '../../context/CartContext';
import { formatAUD } from '../../lib/products';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

// ────────────────────────────────────────────────────────────────────────────────
// Inner form — must be inside <Elements> provider
// ────────────────────────────────────────────────────────────────────────────────
function PaymentForm({
  grandTotal, items, totalPrice, shipping, clearCart,
}: {
  grandTotal: number;
  items: ReturnType<typeof useCart>['items'];
  totalPrice: number;
  shipping: number;
  clearCart: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [stateVal, setStateVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setErrorMsg('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      setErrorMsg(error.message ?? 'Payment failed. Please try again.');
      setLoading(false);
    }
    // On success, Stripe redirects to /checkout/success automatically
    // CartContext clears on that page via a separate useEffect
  }

  return (
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
          <select id="co-state" className="checkout-input" required
            value={stateVal} onChange={e => setStateVal(e.target.value)}>
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
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Card, Afterpay, Apple Pay and Google Pay accepted.
      </p>

      {/* Stripe Payment Element — renders card + Afterpay tabs automatically */}
      <div className="stripe-element-wrap">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {errorMsg && (
        <div className="stripe-error" role="alert">{errorMsg}</div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!stripe || loading}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)', minHeight: '52px', fontSize: 'var(--text-base)' }}
      >
        {loading ? 'Processing…' : `Pay ${formatAUD(grandTotal)}`}
      </button>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
        🔒 Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Outer wrapper — fetches PaymentIntent, provides <Elements>
// ────────────────────────────────────────────────────────────────────────────────
export function CheckoutForm() {
  const { items, totalPrice, totalItems, clearCart, hydrated } = useCart();
  const [clientSecret, setClientSecret] = useState('');
  const [intentError, setIntentError] = useState('');

  const shipping = totalPrice >= 150 ? 0 : 12.95;
  const grandTotal = totalPrice + shipping;

  // Create PaymentIntent as soon as we know the cart total
  useEffect(() => {
    if (!hydrated || totalItems === 0) return;
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: grandTotal }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setIntentError(data.error ?? 'Could not initialise payment.');
      })
      .catch(() => setIntentError('Network error — please refresh and try again.'));
  }, [hydrated, totalItems, grandTotal]);

  // ── Loading ──
  if (!hydrated) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>
        Loading your bag…
      </div>
    );
  }

  // ── Empty bag ──
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

  // ── Stripe init error ──
  if (intentError) {
    return (
      <div className="order-success">
        <div className="order-success__icon">⚠️</div>
        <h2>Payment setup failed</h2>
        <p>{intentError}</p>
        <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }

  // ── Waiting for clientSecret ──
  if (!clientSecret) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>
        Preparing payment…
      </div>
    );
  }

  const stripeAppearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#8b1a3a',
      colorBackground: '#ffffff',
      colorText: '#1a0a10',
      borderRadius: '12px',
      fontFamily: 'Satoshi, system-ui, sans-serif',
    },
  };

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <div className="checkout-grid">
        <PaymentForm
          grandTotal={grandTotal}
          items={items}
          totalPrice={totalPrice}
          shipping={shipping}
          clearCart={clearCart}
        />

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
            <div className="order-total-row"><span>Subtotal</span><span>{formatAUD(totalPrice)}</span></div>
            <div className="order-total-row">
              <span>Shipping</span>
              <span>{shipping === 0
                ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Free</span>
                : formatAUD(shipping)}
              </span>
            </div>
            {shipping > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '-.5rem' }}>
                Add {formatAUD(150 - totalPrice)} more for free shipping
              </p>
            )}
            <div className="order-total-row order-total-row--grand">
              <strong>Total (AUD)</strong><strong>{formatAUD(grandTotal)}</strong>
            </div>
          </div>
          <div className="order-trust">
            {['🔒 Secure checkout', '↩️ 15-day returns', '🚚 Australia-wide delivery', '✅ Authentic products'].map(t => (
              <span key={t} className="order-trust-item">{t}</span>
            ))}
          </div>
        </aside>
      </div>
    </Elements>
  );
}
