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
import { supabase } from '../../lib/supabase';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

export type ShippingAddress = {
  name: string; email: string; phone: string;
  line1: string; line2: string; suburb: string; state: string; postcode: string;
};

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function PaymentForm({
  grandTotal, items, clearCart, shipping_address, paymentIntentId,
}: {
  grandTotal: number;
  items: ReturnType<typeof useCart>['items'];
  clearCart: () => void;
  shipping_address: ShippingAddress;
  paymentIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { name, email, phone, line1, suburb, state, postcode } = shipping_address;
    if (!name || !email || !phone || !line1 || !suburb || !state || !postcode) {
      setErrorMsg('Please fill in all required fields before paying.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // Update payment intent with form data + user_id before confirming
    try {
      const token = await getAccessToken();
      await fetch('/api/update-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          token,
          metadata: {
            customer_name:     name,
            customer_email:    email,
            customer_phone:    phone,
            shipping_line1:    shipping_address.line1,
            shipping_line2:    shipping_address.line2,
            shipping_suburb:   suburb,
            shipping_state:    state,
            shipping_postcode: postcode,
            items: JSON.stringify(items.map(i => ({
              id: i.id, name: i.name, quantity: i.quantity, price: i.price, size: i.selectedSize,
            }))),
          },
        }),
      });
    } catch { /* non-fatal */ }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        payment_method_data: {
          billing_details: {
            name, email, phone,
            address: {
              line1,
              line2: shipping_address.line2 || undefined,
              city: suburb, state,
              postal_code: postcode,
              country: 'AU',
            },
          },
        },
      },
    });

    if (error) {
      setErrorMsg(error.message ?? 'Payment failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <h2 className="checkout-section-title">Contact information</h2>
      <div className="checkout-fields">
        <div className="checkout-field">
          <label htmlFor="co-name" className="checkout-label">Full name *</label>
          <input id="co-name" type="text" placeholder="Jane Smith" className="checkout-input" required
            value={shipping_address.name} onChange={e => { shipping_address.name = e.target.value; }} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-email" className="checkout-label">Email address *</label>
          <input id="co-email" type="email" placeholder="jane@example.com.au" className="checkout-input" required
            value={shipping_address.email} onChange={e => { shipping_address.email = e.target.value; }} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-phone" className="checkout-label">Mobile number *</label>
          <input id="co-phone" type="tel" placeholder="04XX XXX XXX" className="checkout-input" required
            value={shipping_address.phone} onChange={e => { shipping_address.phone = e.target.value; }} />
        </div>
      </div>

      <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Shipping address</h2>
      <div className="checkout-fields checkout-fields--halves">
        <div className="checkout-field">
          <label htmlFor="co-addr1" className="checkout-label">Street address *</label>
          <input id="co-addr1" type="text" placeholder="12 Collins Street" className="checkout-input" required
            value={shipping_address.line1} onChange={e => { shipping_address.line1 = e.target.value; }} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-addr2" className="checkout-label">Apartment / unit (optional)</label>
          <input id="co-addr2" type="text" placeholder="Unit 4" className="checkout-input"
            value={shipping_address.line2} onChange={e => { shipping_address.line2 = e.target.value; }} />
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-suburb" className="checkout-label">Suburb *</label>
          <input id="co-suburb" type="text" placeholder="Melbourne" className="checkout-input" required
            value={shipping_address.suburb} onChange={e => { shipping_address.suburb = e.target.value; }} />
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-state" className="checkout-label">State / Territory *</label>
          <select id="co-state" className="checkout-input" required
            value={shipping_address.state} onChange={e => { shipping_address.state = e.target.value; }}>
            <option value="">Select state…</option>
            {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-postcode" className="checkout-label">Postcode *</label>
          <input id="co-postcode" type="text" placeholder="3000" maxLength={4} pattern="[0-9]{4}" className="checkout-input" required
            value={shipping_address.postcode} onChange={e => { shipping_address.postcode = e.target.value; }} />
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
      <div className="stripe-element-wrap">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {errorMsg && <div className="stripe-error" role="alert">{errorMsg}</div>}

      <button type="submit" className="btn btn-primary"
        disabled={!stripe || loading}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)', minHeight: '52px', fontSize: 'var(--text-base)' }}>
        {loading ? 'Processing…' : `Pay ${formatAUD(grandTotal)}`}
      </button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
        🔒 Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}

export function CheckoutForm() {
  const { items, totalPrice, totalItems, clearCart, hydrated } = useCart();
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [intentError, setIntentError] = useState('');

  const [addr, setAddr] = useState<ShippingAddress>({
    name: '', email: '', phone: '',
    line1: '', line2: '', suburb: '', state: '', postcode: '',
  });

  const shipping = totalPrice >= 150 ? 0 : 12.95;
  const grandTotal = totalPrice + shipping;

  useEffect(() => {
    if (!hydrated || totalItems === 0) return;
    (async () => {
      const token = await getAccessToken();
      fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: grandTotal, token }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.clientSecret.split('_secret_')[0]);
          } else {
            setIntentError(data.error ?? 'Could not initialise payment.');
          }
        })
        .catch(() => setIntentError('Network error — please refresh and try again.'));
    })();
  }, [hydrated, totalItems, grandTotal]);

  if (!hydrated) return <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>Loading your bag…</div>;
  if (totalItems === 0) return (
    <div className="order-success">
      <div className="order-success__icon">🛍️</div>
      <h2>Your bag is empty</h2>
      <p>Add some beautiful pieces before checking out.</p>
      <a href="/collections" className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }}>Shop collections</a>
    </div>
  );
  if (intentError) return (
    <div className="order-success">
      <div className="order-success__icon">⚠️</div>
      <h2>Payment setup failed</h2>
      <p>{intentError}</p>
      <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => window.location.reload()}>Try again</button>
    </div>
  );
  if (!clientSecret) return <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>Preparing payment…</div>;

  const stripeAppearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#8b1a3a', colorBackground: '#ffffff',
      colorText: '#1a0a10', borderRadius: '12px',
      fontFamily: 'Satoshi, system-ui, sans-serif',
    },
  };

  const addrProxy = new Proxy(addr, {
    get: (target, prop) => target[prop as keyof ShippingAddress],
    set: (target, prop, value) => {
      setAddr(prev => ({ ...prev, [prop as keyof ShippingAddress]: value }));
      return true;
    },
  });

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <div className="checkout-grid">
        <PaymentForm
          grandTotal={grandTotal}
          items={items}
          clearCart={clearCart}
          shipping_address={addrProxy}
          paymentIntentId={paymentIntentId}
        />
        <aside className="order-summary">
          <h2 className="checkout-section-title">Order summary</h2>
          <ul className="order-items">
            {items.map(item => (
              <li key={item.id} className="order-item">
                <div className="order-item__image">
                  {item.image ? <img src={item.image} alt={item.name} /> : <span>🧵</span>}
                  <span className="order-item__qty">{item.quantity}</span>
                </div>
                <div className="order-item__details">
                  <div className="order-item__name">{item.name}</div>
                  {item.subtitle && <div className="order-item__sub">{item.subtitle}</div>}
                  {item.selectedSize && <div className="order-item__sub">Size: {item.selectedSize}</div>}
                </div>
                <div className="order-item__price">{formatAUD(item.price * item.quantity)}</div>
              </li>
            ))}
          </ul>
          <div className="order-totals">
            <div className="order-total-row"><span>Subtotal</span><span>{formatAUD(totalPrice)}</span></div>
            <div className="order-total-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Free</span> : formatAUD(shipping)}</span>
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
