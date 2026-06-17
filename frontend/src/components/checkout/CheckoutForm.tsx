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
import { useAuth } from '../../context/AuthContext';
import { formatAUD } from '../../lib/products';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

type PaymentMethod = 'card' | 'cash' | 'eftpos' | 'payid';

const PAYMENT_OPTIONS: { value: PaymentMethod; icon: string; label: string; description: string }[] = [
  { value: 'card',   icon: '💳', label: 'Card / Afterpay',   description: 'Credit card, Apple Pay, Google Pay, Afterpay' },
  { value: 'cash',   icon: '💵', label: 'Cash on Delivery',  description: 'Pay with cash when your order arrives' },
  { value: 'eftpos', icon: '🏧', label: 'EFTPOS / In-store', description: 'Pay in store or when we contact you' },
  { value: 'payid',  icon: '📲', label: 'PayID / Bank Transfer', description: 'Transfer to orders@ethnicstory.com.au' },
];

export type ShippingAddress = {
  name: string; email: string; phone: string;
  line1: string; line2: string; suburb: string; state: string; postcode: string;
};

// ─── Shared address fields ────────────────────────────────────────────────────
function AddressFields({ addr, onChange }: { addr: ShippingAddress; onChange: (key: keyof ShippingAddress, val: string) => void }) {
  return (
    <>
      <h2 className="checkout-section-title">Contact information</h2>
      <div className="checkout-fields">
        <div className="checkout-field">
          <label htmlFor="co-name" className="checkout-label">Full name *</label>
          <input id="co-name" type="text" placeholder="Jane Smith" className="checkout-input" required
            value={addr.name} onChange={e => onChange('name', e.target.value)} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-email" className="checkout-label">Email address *</label>
          <input id="co-email" type="email" placeholder="jane@example.com.au" className="checkout-input" required
            value={addr.email} onChange={e => onChange('email', e.target.value)} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-phone" className="checkout-label">Mobile number *</label>
          <input id="co-phone" type="tel" placeholder="04XX XXX XXX" className="checkout-input" required
            value={addr.phone} onChange={e => onChange('phone', e.target.value)} />
        </div>
      </div>

      <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Shipping address</h2>
      <div className="checkout-fields checkout-fields--halves">
        <div className="checkout-field">
          <label htmlFor="co-addr1" className="checkout-label">Street address *</label>
          <input id="co-addr1" type="text" placeholder="12 Collins Street" className="checkout-input" required
            value={addr.line1} onChange={e => onChange('line1', e.target.value)} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-addr2" className="checkout-label">Apartment / unit (optional)</label>
          <input id="co-addr2" type="text" placeholder="Unit 4" className="checkout-input"
            value={addr.line2} onChange={e => onChange('line2', e.target.value)} />
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-suburb" className="checkout-label">Suburb *</label>
          <input id="co-suburb" type="text" placeholder="Melbourne" className="checkout-input" required
            value={addr.suburb} onChange={e => onChange('suburb', e.target.value)} />
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-state" className="checkout-label">State / Territory *</label>
          <select id="co-state" className="checkout-input" required
            value={addr.state} onChange={e => onChange('state', e.target.value)}>
            <option value="">Select state…</option>
            {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-postcode" className="checkout-label">Postcode *</label>
          <input id="co-postcode" type="text" placeholder="3000" maxLength={4} pattern="[0-9]{4}" className="checkout-input" required
            value={addr.postcode} onChange={e => onChange('postcode', e.target.value)} />
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-country" className="checkout-label">Country</label>
          <input id="co-country" type="text" value="Australia" readOnly className="checkout-input"
            style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }} />
        </div>
      </div>
    </>
  );
}

// ─── Stripe card form ─────────────────────────────────────────────────────────
function PaymentForm({
  grandTotal, items, shipping_address, paymentIntentId, accessToken,
}: {
  grandTotal: number;
  items: ReturnType<typeof useCart>['items'];
  shipping_address: ShippingAddress;
  paymentIntentId: string;
  accessToken: string | null;
}) {
  const stripe    = useStripe();
  const elements  = useElements();
  const [loading, setLoading]   = useState(false);
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

    const orderItems = items.map(i => ({
      id: i.id, name: i.name, quantity: i.quantity, price: i.price, size: i.selectedSize,
    }));

    try {
      await fetch('/api/update-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          token: accessToken,
          metadata: {
            customer_name:     name,
            customer_email:    email,
            customer_phone:    phone,
            shipping_line1:    shipping_address.line1,
            shipping_line2:    shipping_address.line2,
            shipping_suburb:   suburb,
            shipping_state:    state,
            shipping_postcode: postcode,
            items:             JSON.stringify(orderItems),
          },
        }),
      });
    } catch { /* non-fatal */ }

    const snap = {
      name, email, phone,
      line1: shipping_address.line1, line2: shipping_address.line2,
      suburb, state, postcode,
      total: grandTotal,
      items: orderItems,
    };
    const snapParam = btoa(encodeURIComponent(JSON.stringify(snap)));

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?snap=${snapParam}`,
        payment_method_data: {
          billing_details: {
            name, email, phone,
            address: { line1, line2: shipping_address.line2 || undefined, city: suburb, state, postal_code: postcode, country: 'AU' },
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

// ─── Manual (non-card) order form ─────────────────────────────────────────────
function ManualPaymentForm({
  grandTotal, shippingCost, items, addr, paymentMethod,
  accessToken, clearCart,
}: {
  grandTotal: number;
  shippingCost: number;
  items: ReturnType<typeof useCart>['items'];
  addr: ShippingAddress;
  paymentMethod: PaymentMethod;
  accessToken: string | null;
  clearCart: () => void;
}) {
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { name, email, phone, line1, suburb, state, postcode } = addr;
    if (!name || !email || !phone || !line1 || !suburb || !state || !postcode) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setLoading(true); setErrorMsg('');

    const orderItems = items.map(i => ({
      id: i.id, name: i.name, quantity: i.quantity, price: i.price, size: i.selectedSize,
    }));

    try {
      // Try to get user_id from session token
      let user_id: string | null = null;
      if (accessToken) {
        try {
          const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${accessToken}` } });
          if (res.ok) { const u = await res.json(); user_id = u.id ?? null; }
        } catch { /* guest */ }
      }

      const res = await fetch('/api/create-manual-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method:    paymentMethod,
          items:             orderItems,
          customer_name:     name,
          customer_email:    email,
          customer_phone:    phone,
          shipping_line1:    addr.line1,
          shipping_line2:    addr.line2,
          shipping_suburb:   suburb,
          shipping_state:    state,
          shipping_postcode: postcode,
          amount_aud:        grandTotal,
          shipping_cost:     shippingCost,
          user_id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.orderId) {
        setErrorMsg(data.error ?? 'Failed to place order. Please try again.');
        setLoading(false);
        return;
      }

      clearCart();
      window.location.href = `/orders/${data.orderId}?placed=1`;
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Network error. Please try again.');
      setLoading(false);
    }
  }

  const INSTRUCTIONS: Record<string, React.ReactNode> = {
    cash: (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', fontSize: '.88rem', lineHeight: 1.6 }}>
        <strong>💵 Cash on Delivery</strong><br />
        Please have the exact amount of <strong>{formatAUD(grandTotal)}</strong> ready when your order arrives.
        We'll contact you with a delivery window.
      </div>
    ),
    eftpos: (
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', fontSize: '.88rem', lineHeight: 1.6 }}>
        <strong>🏧 EFTPOS / In-store Payment</strong><br />
        Our team will contact you to arrange payment once your order is ready to dispatch.
      </div>
    ),
    payid: (
      <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '14px 18px', fontSize: '.88rem', lineHeight: 1.6 }}>
        <strong>📲 PayID / Bank Transfer</strong><br />
        Transfer <strong>{formatAUD(grandTotal)}</strong> to:<br />
        <span style={{ fontFamily: 'monospace', background: '#f3e8ff', padding: '2px 8px', borderRadius: 4, display: 'inline-block', margin: '4px 0' }}>orders@ethnicstory.com.au</span><br />
        Use your email as the reference. Your order will be dispatched once payment is confirmed.
      </div>
    ),
  };

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Payment instructions</h2>
      {INSTRUCTIONS[paymentMethod]}

      {errorMsg && <div className="stripe-error" role="alert" style={{ marginTop: '1rem' }}>{errorMsg}</div>}

      <button type="submit" className="btn btn-primary"
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)', minHeight: '52px', fontSize: 'var(--text-base)' }}>
        {loading ? 'Placing order…' : `Place order · ${formatAUD(grandTotal)}`}
      </button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
        🔒 Your details are stored securely.
      </p>
    </form>
  );
}

// ─── Payment method selector ──────────────────────────────────────────────────
function PaymentMethodSelector({ value, onChange }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void }) {
  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <h2 className="checkout-section-title">Payment method</h2>
      <div style={{ display: 'grid', gap: '.75rem' }}>
        {PAYMENT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '14px 18px', border: `2px solid ${value === opt.value ? '#9d174d' : '#e5e7eb'}`,
              borderRadius: 12, background: value === opt.value ? '#fdf2f8' : '#fff',
              cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
            }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{opt.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: value === opt.value ? '#9d174d' : '#1a1a1a' }}>{opt.label}</div>
              <div style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: 2 }}>{opt.description}</div>
            </div>
            {value === opt.value && (
              <span style={{ marginLeft: 'auto', color: '#9d174d', fontWeight: 700, fontSize: '1.1rem' }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main CheckoutForm shell ──────────────────────────────────────────────────
export function CheckoutForm() {
  const { items, totalPrice, totalItems, clearCart, hydrated } = useCart();
  const { session } = useAuth();

  const [addr, setAddr] = useState<ShippingAddress>({
    name: '', email: '', phone: '',
    line1: '', line2: '', suburb: '', state: '', postcode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Stripe state (only used for card payments)
  const [clientSecret, setClientSecret]   = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [intentError, setIntentError]     = useState('');

  const shipping    = totalPrice >= 150 ? 0 : 12.95;
  const grandTotal  = totalPrice + shipping;

  // Create payment intent only when card is selected
  useEffect(() => {
    if (!hydrated || totalItems === 0 || paymentMethod !== 'card') return;
    if (clientSecret) return; // already created
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: grandTotal, token: session?.access_token ?? null }),
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
  }, [hydrated, totalItems, grandTotal, paymentMethod, session, clientSecret]);

  function handleAddrChange(key: keyof ShippingAddress, val: string) {
    setAddr(prev => ({ ...prev, [key]: val }));
  }

  if (!hydrated) return <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>Loading your bag…</div>;
  if (totalItems === 0) return (
    <div className="order-success">
      <div className="order-success__icon">🛍️</div>
      <h2>Your bag is empty</h2>
      <p>Add some beautiful pieces before checking out.</p>
      <a href="/collections" className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }}>Shop collections</a>
    </div>
  );

  const stripeAppearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#8b1a3a', colorBackground: '#ffffff',
      colorText: '#1a0a10', borderRadius: '12px',
      fontFamily: 'Satoshi, system-ui, sans-serif',
    },
  };

  const orderSummary = (
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
  );

  // ── Non-card checkout (manual order) ──────────────────────────────────────
  if (paymentMethod !== 'card') {
    return (
      <div className="checkout-grid">
        <div>
          <AddressFields addr={addr} onChange={handleAddrChange} />
          <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
          <ManualPaymentForm
            grandTotal={grandTotal}
            shippingCost={shipping}
            items={items}
            addr={addr}
            paymentMethod={paymentMethod}
            accessToken={session?.access_token ?? null}
            clearCart={clearCart}
          />
        </div>
        {orderSummary}
      </div>
    );
  }

  // ── Card checkout (Stripe) ────────────────────────────────────────────────
  if (intentError) return (
    <div className="order-success">
      <div className="order-success__icon">⚠️</div>
      <h2>Payment setup failed</h2>
      <p>{intentError}</p>
      <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => window.location.reload()}>Try again</button>
    </div>
  );
  if (!clientSecret) return <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>Preparing payment…</div>;

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
        <div>
          <AddressFields addr={addr} onChange={handleAddrChange} />
          <PaymentMethodSelector value={paymentMethod} onChange={pm => {
            setPaymentMethod(pm);
            // Reset intent error if switching back to card
            if (pm === 'card') setIntentError('');
          }} />
          <PaymentForm
            grandTotal={grandTotal}
            items={items}
            shipping_address={addrProxy}
            paymentIntentId={paymentIntentId}
            accessToken={session?.access_token ?? null}
          />
        </div>
        {orderSummary}
      </div>
    </Elements>
  );
}
