'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

type Variant  = { id: string; size: string; stock_count: number };
type StockMap = Record<string, number>;

type CouponResult = {
  valid: true;
  coupon_id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
} | { valid: false; error: string };

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
      const count = Number(v.stock_count);
      map[itemKey(pid, v.size)] = count;
      map[pid] = Math.max(map[pid] ?? 0, count);
    }
    if (!variants || variants.length === 0) map[pid] = 0;
  }
  return map;
}

// ─── Coupon input widget ──────────────────────────────────────────────────────
function CouponInput({
  subtotal, appliedCoupon, onApply, onRemove,
}: {
  subtotal: number;
  appliedCoupon: (CouponResult & { valid: true }) | null;
  onApply: (c: CouponResult & { valid: true }) => void;
  onRemove: () => void;
}) {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleApply() {
    if (!code.trim()) { setError('Enter a coupon code.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), subtotal }),
      });
      const data: CouponResult = await res.json();
      if (data.valid) { onApply(data); setCode(''); }
      else setError(data.error);
    } catch {
      setError('Could not validate coupon. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (appliedCoupon) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-2)' }}>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#15803d' }}>🏷️ {appliedCoupon.code}</div>
          {appliedCoupon.description && <div style={{ fontSize: 'var(--text-xs)', color: '#166534', marginTop: '2px' }}>{appliedCoupon.description}</div>}
        </div>
        <button onClick={onRemove} style={{ fontSize: 'var(--text-xs)', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '0 var(--space-1)' }}>✕ Remove</button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input type="text" placeholder="Coupon code" value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
          style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', border: `1.5px solid ${error ? '#fca5a5' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', letterSpacing: '.05em' }}
        />
        <button onClick={handleApply} disabled={loading}
          style={{ padding: 'var(--space-2) var(--space-4)', background: loading ? 'var(--color-border)' : 'var(--color-text)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: loading ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
          {loading ? '\u2026' : 'Apply'}
        </button>
      </div>
      {error && <p style={{ fontSize: 'var(--text-xs)', color: '#dc2626', margin: 'var(--space-1) 0 0' }}>{error}</p>}
    </div>
  );
}

// ─── Inner payment form ───────────────────────────────────────────────────────
function PaymentForm({
  grandTotal, selectedItems, paymentIntentId, accessToken, isLoggedIn,
  addr, setAddr, stockMap, discountAmount, appliedCoupon, subtotal, shippingCost,
}: {
  grandTotal: number;
  selectedItems: CartItem[];
  paymentIntentId: string;
  accessToken: string | null;
  isLoggedIn: boolean;
  addr: ShippingAddress;
  setAddr: React.Dispatch<React.SetStateAction<ShippingAddress>>;
  stockMap: StockMap;
  discountAmount: number;
  appliedCoupon: (CouponResult & { valid: true }) | null;
  subtotal: number;
  shippingCost: number;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading]   = useState(false);
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

    // ── Stock guard: re-check every selected item before charging ──────────
    for (const item of selectedItems) {
      const key        = itemKey(item.id, item.selectedSize);
      const stock      = stockMap[key] ?? stockMap[item.id] ?? 0;
      if (stock <= 0) {
        setErrorMsg(`"${item.name}"${item.selectedSize ? ` (${item.selectedSize})` : ''} is out of stock and cannot be purchased.`);
        return;
      }
      if (item.quantity > stock) {
        setErrorMsg(`"${item.name}"${item.selectedSize ? ` (${item.selectedSize})` : ''} only has ${stock} in stock — please reduce the quantity.`);
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    const orderItems = selectedItems.map(i => ({
      id: i.id, slug: i.slug, name: i.name,
      quantity: i.quantity, price: i.price,
      size: i.selectedSize, image: i.image,
    }));

    try {
      await fetch('/api/update-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          amount:         grandTotal,
          token:          accessToken,
          couponCode:     appliedCoupon?.code    ?? null,
          discountAmount: discountAmount         ?? 0,
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

    // Include subtotal, shippingCost, discountAmount in snap so success page can render correctly
    const snap = {
      name, email, phone, line1, line2, suburb, state, postcode,
      total: grandTotal,
      subtotal,
      shippingCost,
      discountAmount,
      couponCode: appliedCoupon?.code ?? null,
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
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', marginTop: '-2px' }}>\u2713 Signed in \u2014 your details have been pre-filled.</p>
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
          <input id="co-email" type="email" placeholder="jane@example.com.au" className="checkout-input" required
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
            <option value="">Select state\u2026</option>
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
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Card, Afterpay, Apple Pay and Google Pay accepted.</p>
      <div className="stripe-element-wrap">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {errorMsg && <div className="stripe-error" role="alert">{errorMsg}</div>}
      <button type="submit" className="btn btn-primary"
        disabled={!stripe || loading || selectedItems.length === 0}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)', minHeight: '52px', fontSize: 'var(--text-base)' }}>
        {loading ? 'Processing\u2026' : `Pay ${formatAUD(grandTotal)}`}
      </button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>\uD83D\uDD12 Secured by Stripe \u00B7 256-bit SSL encryption</p>
    </form>
  );
}

// ─── Item selector ────────────────────────────────────────────────────────────
function ItemSelector({
  items, stockMap, stockLoaded, selectedKeys, onToggle,
}: {
  items: CartItem[];
  stockMap: StockMap;
  stockLoaded: boolean;
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
          const stock      = stockLoaded ? (stockMap[key] ?? stockMap[item.id] ?? 0) : null;
          const outOfStock = stock !== null && stock <= 0;
          const overStock  = stock !== null && !outOfStock && item.quantity > stock;
          const checked    = selectedKeys.has(key) && !outOfStock;
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
              <input
                type="checkbox"
                id={`item-sel-${key}`}
                checked={checked}
                disabled={outOfStock || !stockLoaded}
                onChange={() => { if (!outOfStock && stockLoaded) onToggle(key); }}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: (outOfStock || !stockLoaded) ? 'not-allowed' : 'pointer', flexShrink: 0 }}
              />
              <label
                htmlFor={`item-sel-${key}`}
                onClick={e => { if (outOfStock || !stockLoaded) e.preventDefault(); }}
                style={{ flex: 1, cursor: (outOfStock || !stockLoaded) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
              >
                {item.image && <img src={item.image} alt={item.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {item.selectedSize && <span>Size: {item.selectedSize} \u00B7 </span>}
                    Qty: {item.quantity}
                    {!stockLoaded && <span style={{ color: 'var(--color-text-faint)', marginLeft: '0.5rem' }}>\u00B7 Checking stock\u2026</span>}
                    {outOfStock && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: '0.5rem' }}>\u00B7 Out of stock</span>}
                    {overStock && !outOfStock && <span style={{ color: '#d97706', fontWeight: 600, marginLeft: '0.5rem' }}>\u00B7 Only {stock} left</span>}
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

  const [clientSecret, setClientSecret]         = useState('');
  const [paymentIntentId, setPaymentIntentId]   = useState('');
  const [intentError, setIntentError]           = useState('');
  const [prefillLoaded, setPrefillLoaded]       = useState(false);
  const [stockMap, setStockMap]                 = useState<StockMap>({});
  const [stockLoaded, setStockLoaded]           = useState(false);
  const [selectedKeys, setSelectedKeys]         = useState<Set<string>>(new Set());
  const [appliedCoupon, setAppliedCoupon]       = useState<(CouponResult & { valid: true }) | null>(null);
  const initialSelectionDone = useRef(false);
  const intentCreated        = useRef(false);

  const [addr, setAddr] = useState<ShippingAddress>({
    name: '', email: '', phone: '',
    line1: '', line2: '', suburb: '', state: '', postcode: '',
  });

  // Auto-select all in-stock items once stock is confirmed
  useEffect(() => {
    if (items.length === 0 || !stockLoaded) return;
    if (initialSelectionDone.current) return;
    initialSelectionDone.current = true;
    const keys = items
      .filter(i => {
        const k = itemKey(i.id, i.selectedSize);
        const stock = stockMap[k] ?? stockMap[i.id] ?? 0;
        return stock > 0;
      })
      .map(i => itemKey(i.id, i.selectedSize));
    setSelectedKeys(new Set(keys));
  }, [stockMap, stockLoaded, items]);

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

  const selectedPrice  = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost   = selectedPrice >= 150 ? 0 : selectedPrice > 0 ? 12.95 : 0;

  const discountAmount = appliedCoupon
    ? Math.round(Math.min(selectedPrice, appliedCoupon.discount_amount) * 100) / 100
    : 0;
  const grandTotal = Math.max(0, selectedPrice + shippingCost - discountAmount);

  // Re-validate coupon whenever selectedPrice changes
  useEffect(() => {
    if (!appliedCoupon) return;
    fetch('/api/validate-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: appliedCoupon.code, subtotal: selectedPrice }),
    })
      .then(r => r.json())
      .then((data: CouponResult) => {
        if (data.valid) setAppliedCoupon(data);
        else setAppliedCoupon(null);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrice]);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    fetchStockForItems(items).then(map => {
      setStockMap(map);
      setStockLoaded(true);
    });
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

  // Create PI only after stock is loaded and there are selected items
  useEffect(() => {
    if (!hydrated || !stockLoaded || grandTotal < 0.5) return;
    if (intentCreated.current) return;
    intentCreated.current = true;
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:         grandTotal,
        token:          session?.access_token ?? null,
        couponCode:     appliedCoupon?.code    ?? null,
        discountAmount: discountAmount,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.clientSecret.split('_secret_')[0]);
          setIntentError('');
        } else {
          setIntentError(data.error ?? 'Could not initialise payment.');
          intentCreated.current = false;
        }
      })
      .catch(() => {
        setIntentError('Network error \u2014 please refresh and try again.');
        intentCreated.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, stockLoaded, grandTotal, session]);

  if (!hydrated) return <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>Loading your bag\u2026</div>;
  if (totalItems === 0) return (
    <div className="order-success">
      <div className="order-success__icon">\uD83D\uDED1</div>
      <h2>Your bag is empty</h2>
      <p>Add some beautiful pieces before checking out.</p>
      <a href="/collections" className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }}>Shop collections</a>
    </div>
  );
  if (intentError) return (
    <div className="order-success">
      <div className="order-success__icon">\u26A0\uFE0F</div>
      <h2>Payment setup failed</h2>
      <p>{intentError}</p>
      <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => { intentCreated.current = false; window.location.reload(); }}>Try again</button>
    </div>
  );
  if (!clientSecret) return <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-muted)' }}>Preparing payment\u2026</div>;

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
          <ItemSelector items={items} stockMap={stockMap} stockLoaded={stockLoaded} selectedKeys={selectedKeys} onToggle={toggleItem} />
          <PaymentForm
            grandTotal={grandTotal}
            selectedItems={selectedItems}
            paymentIntentId={paymentIntentId}
            accessToken={session?.access_token ?? null}
            isLoggedIn={!!user}
            addr={addr}
            setAddr={setAddr}
            stockMap={stockMap}
            discountAmount={discountAmount}
            appliedCoupon={appliedCoupon}
            subtotal={selectedPrice}
            shippingCost={shippingCost}
          />
        </div>
        <aside className="order-summary">
          <h2 className="checkout-section-title">Order summary</h2>
          {selectedItems.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', padding: 'var(--space-4) 0' }}>No items selected \u2014 tick items above to see your total.</p>
          ) : (
            <ul className="order-items">
              {selectedItems.map(item => (
                <li key={itemKey(item.id, item.selectedSize)} className="order-item">
                  <div className="order-item__image">
                    {item.image ? <img src={item.image} alt={item.name} /> : <span>\uD83E\uDDF5</span>}
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

          {selectedItems.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>\uD83C\uDFF7\uFE0F Have a coupon?</p>
              <CouponInput subtotal={selectedPrice} appliedCoupon={appliedCoupon} onApply={setAppliedCoupon} onRemove={() => setAppliedCoupon(null)} />
            </div>
          )}

          <div className="order-totals">
            <div className="order-total-row"><span>Subtotal</span><span>{formatAUD(selectedPrice)}</span></div>
            <div className="order-total-row">
              <span>Shipping</span>
              <span>{shippingCost === 0 && selectedPrice > 0 ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Free</span> : selectedPrice > 0 ? formatAUD(shippingCost) : '\u2014'}</span>
            </div>
            {shippingCost > 0 && selectedPrice > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '-.5rem' }}>Add {formatAUD(150 - selectedPrice)} more for free shipping</p>
            )}
            {discountAmount > 0 && (
              <div className="order-total-row" style={{ color: '#15803d' }}>
                <span>\uD83C\uDFF7\uFE0F Coupon ({appliedCoupon?.discount_type === 'percentage' ? `${appliedCoupon.discount_value}% off` : `${appliedCoupon?.code}`})</span>
                <span style={{ fontWeight: 700 }}>\u2212{formatAUD(discountAmount)}</span>
              </div>
            )}
            <div className="order-total-row order-total-row--grand">
              <strong>Total (AUD)</strong><strong>{formatAUD(grandTotal)}</strong>
            </div>
          </div>
          <div className="order-trust">
            {['\uD83D\uDD12 Secure checkout', '\u21A9\uFE0F 15-day returns', '\uD83D\uDE9A Australia-wide delivery', '\u2705 Authentic products'].map(t => (
              <span key={t} className="order-trust-item">{t}</span>
            ))}
          </div>
        </aside>
      </div>
    </Elements>
  );
}
