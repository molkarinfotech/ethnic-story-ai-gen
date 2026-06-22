'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCart, CartItem, itemKey } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatAUD } from '../../lib/products';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

export type ShippingAddress = {
  name: string; email: string; phone: string;
  line1: string; line2: string; suburb: string; state: string; postcode: string;
};

type Variant = { id: string; size: string; stock_count: number };
type StockMap = Record<string, number>;

async function fetchStockForItems(items: CartItem[]): Promise<StockMap> {
  const uniqueIds = Array.from(new Set(items.map(i => i.id)));
  const results = await Promise.all(
    uniqueIds.map(pid =>
      fetch(`/api/variants/${pid}`)
        .then(r => r.json())
        .then((variants: Variant[]) => ({ pid, variants }))
        .catch(() => ({ pid, variants: [] as Variant[] }))
    )
  );
  const map: StockMap = {};
  for (const { pid, variants } of results) {
    for (const v of variants) {
      map[itemKey(pid, v.size)] = v.stock_count;
      map[pid] = Math.max(map[pid] ?? 0, v.stock_count);
    }
  }
  return map;
}

// ─── Inner payment form ───────────────────────────────────────────────────────
function PaymentForm({
  grandTotal, selectedItems, paymentIntentId, accessToken, isLoggedIn,
  addr, setAddr, stockMap,
}: {
  grandTotal: number;
  selectedItems: CartItem[];
  paymentIntentId: string;
  accessToken: string | null;
  isLoggedIn: boolean;
  addr: ShippingAddress;
  setAddr: React.Dispatch<React.SetStateAction<ShippingAddress>>;
  stockMap: StockMap;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function field(key: keyof ShippingAddress) {
    return {
      value: addr[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setAddr(prev => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { name, email, phone, line1, line2, suburb, state, postcode } = addr;
    if (!name || !email || !phone || !line1 || !suburb || !state || !postcode) {
      setErrorMsg('Please fill in all required fields before paying.');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('Please select at least one item to pay for.');
      return;
    }
    for (const item of selectedItems) {
      const stock = stockMap[itemKey(item.id, item.selectedSize)] ?? stockMap[item.id] ?? 99;
      if (item.quantity > stock) {
        setErrorMsg(`"${item.name}"${item.selectedSize ? ` (${item.selectedSize})` : ''} only has ${stock} in stock.`);
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    // Include slug and image so account order history can display them
    const orderItems = selectedItems.map(i => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      size: i.selectedSize,
      image: i.image,
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
            shipping_line1:    line1,
            shipping_line2:    line2,
            shipping_suburb:   suburb,
            shipping_state:    state,
            shipping_postcode: postcode,
            items:             JSON.stringify(orderItems),
          },
        }),
      });
    } catch { /* non-fatal */ }

    const snap = { name, email, phone, line1, line2, suburb, state, postcode, total: grandTotal, items: orderItems };
    const snapParam = btoa(encodeURIComponent(JSON.stringify(snap)));

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?snap=${snapParam}`,
        payment_method_data: {
          billing_details: {
            name, email, phone,
            address: { line1, line2: line2 || undefined, city: suburb, state, postal_code: postcode, country: 'AU' },
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
      {isLoggedIn && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', marginTop: '-2px' }}>
          ✓ Signed in — your details have been pre-filled.
        </p>
      )}
      <div className="checkout-fields">
        <div className="checkout-field">
          <label htmlFor="co-name" className="checkout-label">Full name *</label>
          <input id="co-name" type="text" placeholder="Jane Smith" className="checkout-input" required {...field('name')} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-email" className="checkout-label">
            Email address *
            {isLoggedIn && <span style={{ marginLeft: '0.4rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>(linked to your account)</span>}
          </label>
          <input
            id="co-email" type="email" placeholder="jane@example.com.au" className="checkout-input" required
            value={addr.email}
            onChange={e => { if (!isLoggedIn) setAddr(prev => ({ ...prev, email: e.target.value })); }}
            readOnly={isLoggedIn}
            style={isLoggedIn ? { background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', cursor: 'not-allowed' } : {}}
            title={isLoggedIn ? 'Email is linked to your account.' : undefined}
          />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-phone" className="checkout-label">Mobile number *</label>
          <input id="co-phone" type="tel" placeholder="04XX XXX XXX" className="checkout-input" required {...field('phone')} />
        </div>
      </div>

      <h2 className="checkout-section-title" style={{ marginTop: 'var(--space-8)' }}>Shipping address</h2>
      <div className="checkout-fields checkout-fields--halves">
        <div className="checkout-field">
          <label htmlFor="co-addr1" className="checkout-label">Street address *</label>
          <input id="co-addr1" type="text" placeholder="12 Collins Street" className="checkout-input" required {...field('line1')} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-addr2" className="checkout-label">Apartment / unit (optional)</label>
          <input id="co-addr2" type="text" placeholder="Unit 4" className="checkout-input" {...field('line2')} />
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-suburb" className="checkout-label">Suburb *</label>
          <input id="co-suburb" type="text" placeholder="Melbourne" className="checkout-input" required {...field('suburb')} />
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-state" className="checkout-label">State / Territory *</label>
          <select id="co-state" className="checkout-input" required value={addr.state}
            onChange={e => setAddr(prev => ({ ...prev, state: e.target.value }))}>
            <option value="">Select state…</option>
            {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="checkout-field checkout-field--half">
          <label htmlFor="co-postcode" className="checkout-label">Postcode *</label>
          <input id="co-postcode" type="text" placeholder="3000" maxLength={4} pattern="[0-9]{4}" className="checkout-input" required {...field('postcode')} />
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
        disabled={!stripe || loading || selectedItems.length === 0}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)', minHeight: '52px', fontSize: 'var(--text-base)' }}>
        {loading ? 'Processing…' : `Pay ${formatAUD(grandTotal)}`}
      </button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
        🔒 Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}

// ─── Item selector ────────────────────────────────────────────────────────────
function ItemSelector({
  items, stockMap, selectedKeys, onToggle,
}: {
  items: CartItem[];
  stockMap: StockMap;
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <h2 className="checkout-section-title">Items to pay for</h2>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
        Select the items you want to pay for now. Unselected items stay in your bag.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map(item => {
          const key = itemKey(item.id, item.selectedSize);
          const stock = stockMap[key] ?? stockMap[item.id] ?? 99;
          const outOfStock = stock === 0;
          const overStock = !outOfStock && item.quantity > stock;
          const checked = selectedKeys.has(key) && !outOfStock;
          return (
            <li key={key} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: outOfStock ? 'var(--color-surface-offset)' : checked ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
              border: `1px solid ${checked && !outOfStock ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              opacity: outOfStock ? 0.65 : 1,
              transition: 'background 180ms, border-color 180ms',
            }}>
              <input type="checkbox" id={`item-sel-${key}`} checked={checked} disabled={outOfStock}
                onChange={() => !outOfStock && onToggle(key)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: outOfStock ? 'not-allowed' : 'pointer', flexShrink: 0 }}
              />
              <label htmlFor={`item-sel-${key}`} style={{ flex: 1, cursor: outOfStock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {item.image && <img src={item.image} alt={item.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {item.selectedSize && <span>Size: {item.selectedSize} · </span>}
                    Qty: {item.quantity}
                    {outOfStock && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: '0.5rem' }}>· Out of stock</span>}
                    {overStock && !outOfStock && <span style={{ color: '#d97706', fontWeight: 600, marginLeft: '0.5rem' }}>· Only {stock} left</span>}
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', flexShrink: 0, color: outOfStock ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                  {formatAUD(item.price * item.quantity)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function CheckoutForm() {
  const { items, totalItems, clearCart, hydrated } = useCart();
  const { user, session } = useAuth();

  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [intentError, setIntentError] = useState('');
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const [stockMap, setStockMap] = useState<StockMap>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const initialSelectionDone = useRef(false);

  const [addr, setAddr] = useState<ShippingAddress>({
    name: '', email: '', phone: '',
    line1: '', line2: '', suburb: '', state: '', postcode: '',
  });

  useEffect(() => {
    if (items.length === 0 || Object.keys(stockMap).length === 0) return;
    if (initialSelectionDone.current) return;
    initialSelectionDone.current = true;
    const keys = items
      .filter(i => (stockMap[itemKey(i.id, i.selectedSize)] ?? stockMap[i.id] ?? 99) > 0)
      .map(i => itemKey(i.id, i.selectedSize));
    setSelectedKeys(new Set(keys));
  }, [stockMap, items]);

  const toggleItem = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectedItems = useMemo(
    () => items.filter(i => selectedKeys.has(itemKey(i.id, i.selectedSize))),
    [items, selectedKeys]
  );

  const selectedPrice = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = selectedPrice >= 150 ? 0 : selectedPrice > 0 ? 12.95 : 0;
  const grandTotal = selectedPrice + shipping;

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    fetchStockForItems(items).then(setStockMap);
  }, [hydrated, items]);

  useEffect(() => {
    if (!user || !session || prefillLoaded) return;
    setPrefillLoaded(true);
    const authName  = (user as any).user_metadata?.full_name ?? (user as any).name ?? '';
    const authEmail = user.email ?? '';
    setAddr(prev => ({ ...prev, name: authName, email: authEmail }));
    fetch('/api/account/orders', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then((orders: any[]) => {
        if (!Array.isArray(orders) || orders.length === 0) return;
        const latest = orders[0];
        const a = latest.shipping_address ?? {};
        setAddr(prev => ({
          name:     prev.name     || latest.customer_name  || authName,
          email:    authEmail,
          phone:    prev.phone    || latest.customer_phone || '',
          line1:    prev.line1    || a.line1               || '',
          line2:    prev.line2    || a.line2               || '',
          suburb:   prev.suburb   || a.suburb              || '',
          state:    prev.state    || a.state               || '',
          postcode: prev.postcode || a.postcode            || '',
        }));
      })
      .catch(() => {});
  }, [user, session, prefillLoaded]);

  useEffect(() => {
    if (!hydrated || grandTotal < 0.5) return;
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
          setIntentError('');
        } else {
          setIntentError(data.error ?? 'Could not initialise payment.');
        }
      })
      .catch(() => setIntentError('Network error — please refresh and try again.'));
  }, [hydrated, grandTotal, session]);

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

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <div className="checkout-grid">
        <div>
          <ItemSelector items={items} stockMap={stockMap} selectedKeys={selectedKeys} onToggle={toggleItem} />
          <PaymentForm
            grandTotal={grandTotal}
            selectedItems={selectedItems}
            paymentIntentId={paymentIntentId}
            accessToken={session?.access_token ?? null}
            isLoggedIn={!!user}
            addr={addr}
            setAddr={setAddr}
            stockMap={stockMap}
          />
        </div>
        <aside className="order-summary">
          <h2 className="checkout-section-title">Order summary</h2>
          {selectedItems.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', padding: 'var(--space-4) 0' }}>No items selected — tick items above to see your total.</p>
          ) : (
            <ul className="order-items">
              {selectedItems.map(item => (
                <li key={itemKey(item.id, item.selectedSize)} className="order-item">
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
          )}
          <div className="order-totals">
            <div className="order-total-row"><span>Subtotal</span><span>{formatAUD(selectedPrice)}</span></div>
            <div className="order-total-row">
              <span>Shipping</span>
              <span>{shipping === 0 && selectedPrice > 0 ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Free</span> : selectedPrice > 0 ? formatAUD(shipping) : '—'}</span>
            </div>
            {shipping > 0 && selectedPrice > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '-.5rem' }}>
                Add {formatAUD(150 - selectedPrice)} more for free shipping
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
