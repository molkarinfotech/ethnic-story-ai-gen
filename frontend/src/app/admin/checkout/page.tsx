'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────
type Product = {
  id: string; name: string; slug: string; price: number;
  image?: string; in_stock?: boolean;
  variants?: { id: string; size: string; stock_count: number }[];
};

type CartItem = {
  productId: string; name: string; price: number;
  quantity: number; size?: string; image?: string;
};

type PaymentMethod = 'cash' | 'eftpos' | 'payid';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const PAYMENT_OPTIONS: { value: PaymentMethod; icon: string; label: string; colour: string }[] = [
  { value: 'cash',   icon: '💵', label: 'Cash',         colour: '#16a34a' },
  { value: 'eftpos', icon: '🏧', label: 'EFTPOS',       colour: '#2563eb' },
  { value: 'payid',  icon: '📲', label: 'PayID / Bank', colour: '#7c3aed' },
];

function formatAUD(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

// ─── Product search panel ────────────────────────────────────────────────
function ProductSearch({ onAdd }: { onAdd: (item: CartItem) => void }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize]         = useState('');
  const [qty, setQty]           = useState(1);
  const [variants, setVariants] = useState<{ id: string; size: string; stock_count: number }[]>([]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}`);
    if (res.ok) setResults(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  async function selectProduct(p: Product) {
    setSelected(p);
    setQty(1); setSize('');
    // Fetch variants for size selection
    const res = await fetch(`/api/admin/products/${p.id}`);
    if (res.ok) {
      const detail = await res.json();
      setVariants(detail.variants ?? []);
    } else {
      setVariants([]);
    }
    setResults([]);
    setQuery('');
  }

  function addToCart() {
    if (!selected) return;
    onAdd({
      productId: selected.id,
      name:      selected.name,
      price:     selected.price,
      quantity:  qty,
      size:      size || undefined,
      image:     selected.image,
    });
    setSelected(null); setSize(''); setQty(1);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: '.6rem' }}>Add product</div>

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by product name…"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '.9rem', boxSizing: 'border-box' }}
        />
        {loading && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '.75rem', color: '#9ca3af' }}>searching…</span>}
      </div>

      {/* Search results dropdown */}
      {results.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
          {results.map(p => (
            <div key={p.id}
              onClick={() => selectProduct(p)}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', background: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              {p.image
                ? <img src={p.image} alt={p.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🧵</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{p.name}</div>
                <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>{formatAUD(p.price)}</div>
              </div>
              {!p.in_stock && <span style={{ fontSize: '.7rem', background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>Out of stock</span>}
            </div>
          ))}
        </div>
      )}

      {/* Selected product row */}
      {selected && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fdf8f4', borderRadius: 10, border: '1px solid #fce7f3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {selected.image
              ? <img src={selected.image} alt={selected.name} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 52, height: 52, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🧵</div>
            }
            <div>
              <div style={{ fontWeight: 700 }}>{selected.name}</div>
              <div style={{ fontSize: '.85rem', color: '#9d174d', fontWeight: 700 }}>{formatAUD(selected.price)}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Size selector */}
            {variants.length > 0 && (
              <div style={{ flex: '1 1 120px' }}>
                <label style={labelSm}>Size</label>
                <select value={size} onChange={e => setSize(e.target.value)} style={inputSm}>
                  <option value="">No size</option>
                  {variants.map(v => (
                    <option key={v.id} value={v.size}>{v.size} (stock: {v.stock_count})</option>
                  ))}
                </select>
              </div>
            )}
            {/* Qty */}
            <div style={{ flex: '0 0 80px' }}>
              <label style={labelSm}>Qty</label>
              <input type="number" min={1} max={99} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} style={inputSm} />
            </div>
            {/* Add button */}
            <button onClick={addToCart}
              style={{ flex: '0 0 auto', padding: '9px 20px', background: '#9d174d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.88rem' }}>
              + Add to order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelSm: React.CSSProperties = { display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 };
const inputSm: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: '.88rem', boxSizing: 'border-box' };

// ─── Cart panel ─────────────────────────────────────────────────────────────────
function Cart({
  items, onQtyChange, onRemove,
}: {
  items: CartItem[];
  onQtyChange: (idx: number, qty: number) => void;
  onRemove: (idx: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'center', color: '#9ca3af', marginBottom: '1rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🛒</div>
        <div style={{ fontSize: '.88rem' }}>No items added yet</div>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: '.75rem' }}>Order items</div>

      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
          {item.image
            ? <img src={item.image} alt={item.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🧵</div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{item.name}</div>
            {item.size && <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>Size: {item.size}</div>}
          </div>
          <input type="number" min={1} max={99} value={item.quantity}
            onChange={e => onQtyChange(idx, Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: 54, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center', fontSize: '.88rem', flexShrink: 0 }}
          />
          <div style={{ fontWeight: 700, color: '#9d174d', fontSize: '.9rem', flexShrink: 0, minWidth: 64, textAlign: 'right' }}>{formatAUD(item.price * item.quantity)}</div>
          <button onClick={() => onRemove(idx)} style={{ background: '#fee2e2', border: 'none', color: '#991b1b', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>✕</button>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontWeight: 800, fontSize: '1.05rem' }}>
        <span>Subtotal</span>
        <span style={{ color: '#9d174d' }}>{formatAUD(subtotal)}</span>
      </div>
    </div>
  );
}

// ─── Success receipt ─────────────────────────────────────────────────────────
function SuccessScreen({
  orderId, customerName, customerEmail, total, paymentMethod, onNewOrder,
}: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: PaymentMethod;
  onNewOrder: () => void;
}) {
  const pm = PAYMENT_OPTIONS.find(o => o.value === paymentMethod);
  return (
    <div style={{ maxWidth: 540, margin: '4rem auto', background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,.1)', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem' }}>✔️</div>
      <h2 style={{ fontFamily: 'Georgia, serif', color: '#9d174d', margin: '0 0 .5rem' }}>Order placed!</h2>
      <p style={{ color: '#6b7280', margin: '0 0 1.5rem' }}>Order confirmation sent to <strong>{customerEmail}</strong></p>

      <div style={{ background: '#fdf8f4', borderRadius: 10, padding: '1rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '.85rem' }}>Order ID</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.85rem' }}>#{orderId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '.85rem' }}>Customer</span>
          <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{customerName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '.85rem' }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#9d174d' }}>{formatAUD(total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af', fontSize: '.85rem' }}>Payment</span>
          <span style={{ fontWeight: 700, fontSize: '.85rem', color: pm?.colour }}>{pm?.icon} {pm?.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={`/admin/orders`}
          style={{ padding: '10px 24px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 700, fontSize: '.88rem', textDecoration: 'none', color: '#1a1a1a' }}>
          View in orders →
        </a>
        <button onClick={onNewOrder}
          style={{ padding: '10px 24px', background: '#9d174d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.88rem' }}>
          + New order
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCheckoutPage() {
  const [cartItems, setCartItems]       = useState<CartItem[]>([]);
  const [paymentMethod, setPayment]     = useState<PaymentMethod>('cash');
  const [shippingCost, setShipping]     = useState<number>(0);
  const [shippingEnabled, setShipEn]    = useState(false);
  const [notes, setNotes]               = useState('');

  // Customer fields
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [line1, setLine1]     = useState('');
  const [line2, setLine2]     = useState('');
  const [suburb, setSuburb]   = useState('');
  const [state, setState]     = useState('');
  const [postcode, setPost]   = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState<{ orderId: string } | null>(null);

  const subtotal   = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const grandTotal = subtotal + (shippingEnabled ? shippingCost : 0);

  function addItem(item: CartItem) {
    setCartItems(prev => {
      const existing = prev.findIndex(i => i.productId === item.productId && i.size === item.size);
      if (existing >= 0) {
        return prev.map((i, idx) => idx === existing ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  }

  function updateQty(idx: number, qty: number) {
    setCartItems(prev => prev.map((i, n) => n === idx ? { ...i, quantity: qty } : i));
  }

  function removeItem(idx: number) {
    setCartItems(prev => prev.filter((_, n) => n !== idx));
  }

  function resetForm() {
    setCartItems([]); setPayment('cash'); setShipping(0); setShipEn(false); setNotes('');
    setName(''); setEmail(''); setPhone('');
    setLine1(''); setLine2(''); setSuburb(''); setState(''); setPost('');
    setSuccess(null); setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0) { setError('Add at least one product.'); return; }
    if (!name || !email) { setError('Customer name and email are required.'); return; }

    setSubmitting(true); setError('');

    const orderItems = cartItems.map(i => ({
      id: i.productId, name: i.name, quantity: i.quantity, price: i.price,
      ...(i.size ? { size: i.size } : {}),
    }));

    const res = await fetch('/api/create-manual-order', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method:    paymentMethod,
        items:             orderItems,
        customer_name:     name,
        customer_email:    email,
        customer_phone:    phone || undefined,
        shipping_line1:    line1  || undefined,
        shipping_line2:    line2  || undefined,
        shipping_suburb:   suburb || undefined,
        shipping_state:    state  || undefined,
        shipping_postcode: postcode || undefined,
        amount_aud:        grandTotal,
        shipping_cost:     shippingEnabled ? shippingCost : 0,
        notes:             notes || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.orderId) {
      setError(data.error ?? 'Failed to create order. Please try again.');
      setSubmitting(false);
      return;
    }

    setSuccess({ orderId: data.orderId });
    setSubmitting(false);
  }

  if (success) {
    return (
      <SuccessScreen
        orderId={success.orderId}
        customerName={name}
        customerEmail={email}
        total={grandTotal}
        paymentMethod={paymentMethod}
        onNewOrder={resetForm}
      />
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#9d174d', margin: 0, fontSize: '1.75rem' }}>🛒 In-Store Checkout</h1>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '.85rem' }}>Create orders for cash, EFTPOS, or PayID payments</p>
        </div>
        <a href="/admin/orders" style={{ marginLeft: 'auto', padding: '8px 18px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: '.85rem', textDecoration: 'none', color: '#374151' }}>
          ← Orders
        </a>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Left column — product search + cart + customer */}
          <div>
            <ProductSearch onAdd={addItem} />
            <Cart items={cartItems} onQtyChange={updateQty} onRemove={removeItem} />

            {/* Customer details */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: '.75rem' }}>Customer details</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelSm}>Full name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputSm} required />
                </div>
                <div>
                  <label style={labelSm}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" style={inputSm} required />
                </div>
                <div>
                  <label style={labelSm}>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="04XX XXX XXX" style={inputSm} />
                </div>
              </div>

              {/* Optional address */}
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '.82rem', fontWeight: 600, color: '#6b7280', userSelect: 'none' }}>+ Shipping address (optional)</summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelSm}>Street</label>
                    <input value={line1} onChange={e => setLine1(e.target.value)} placeholder="12 Collins St" style={inputSm} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelSm}>Unit / Apartment</label>
                    <input value={line2} onChange={e => setLine2(e.target.value)} placeholder="Unit 4" style={inputSm} />
                  </div>
                  <div>
                    <label style={labelSm}>Suburb</label>
                    <input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="Melbourne" style={inputSm} />
                  </div>
                  <div>
                    <label style={labelSm}>State</label>
                    <select value={state} onChange={e => setState(e.target.value)} style={inputSm}>
                      <option value="">Select…</option>
                      {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSm}>Postcode</label>
                    <input value={postcode} onChange={e => setPost(e.target.value)} placeholder="3000" maxLength={4} style={inputSm} />
                  </div>
                </div>
              </details>

              {/* Internal notes */}
              <div style={{ marginTop: '1rem' }}>
                <label style={labelSm}>Internal notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="e.g. customer picked up in store, awaiting PayID confirmation…"
                  style={{ ...inputSm, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* Right column — payment + total */}
          <div style={{ position: 'sticky', top: '1.5rem' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: '.75rem' }}>Payment method</div>

              {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPayment(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    width: '100%', padding: '12px 16px', border: `2px solid ${paymentMethod === opt.value ? opt.colour : '#e5e7eb'}`,
                    borderRadius: 10, background: paymentMethod === opt.value ? `${opt.colour}12` : '#fff',
                    cursor: 'pointer', marginBottom: '.5rem', textAlign: 'left', transition: 'all .15s',
                  }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{opt.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '.92rem', color: paymentMethod === opt.value ? opt.colour : '#1a1a1a' }}>{opt.label}</span>
                  {paymentMethod === opt.value && <span style={{ marginLeft: 'auto', color: opt.colour, fontWeight: 700 }}>✓</span>}
                </button>
              ))}

              {/* PayID instructions reminder */}
              {paymentMethod === 'payid' && (
                <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '10px 14px', fontSize: '.8rem', color: '#7c3aed', marginTop: '.25rem', lineHeight: 1.5 }}>
                  Remind customer to transfer to <strong>orders@ethnicstory.com.au</strong> using their email as reference.
                </div>
              )}
            </div>

            {/* Shipping line */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af' }}>Shipping</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontSize: '.85rem', color: '#374151' }}>
                  <input type="checkbox" checked={shippingEnabled} onChange={e => setShipEn(e.target.checked)} style={{ accentColor: '#9d174d' }} />
                  Add shipping
                </label>
              </div>
              {shippingEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '.9rem' }}>A$</span>
                  <input type="number" min={0} step={0.01} value={shippingCost}
                    onChange={e => setShipping(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: '.9rem' }}
                  />
                </div>
              )}
            </div>

            {/* Order total */}
            <div style={{ background: '#fdf2f8', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', fontSize: '.88rem', color: '#6b7280' }}>
                <span>Subtotal</span><span>{formatAUD(subtotal)}</span>
              </div>
              {shippingEnabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', fontSize: '.88rem', color: '#6b7280' }}>
                  <span>Shipping</span><span>{formatAUD(shippingCost)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '.75rem', borderTop: '2px solid #fce7f3', fontWeight: 800, fontSize: '1.2rem', color: '#9d174d' }}>
                <span>Total</span><span>{formatAUD(grandTotal)}</span>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: '.85rem', marginBottom: '1rem' }}>{error}</div>
            )}

            <button type="submit" disabled={submitting || cartItems.length === 0}
              style={{
                width: '100%', padding: '14px', background: cartItems.length === 0 ? '#e5e7eb' : '#9d174d',
                color: cartItems.length === 0 ? '#9ca3af' : '#fff', border: 'none',
                borderRadius: 10, cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 800, fontSize: '1rem', letterSpacing: '.02em', transition: 'all .15s',
              }}>
              {submitting ? 'Placing order…' : `✔ Confirm & send receipt · ${formatAUD(grandTotal)}`}
            </button>
            <p style={{ fontSize: '.75rem', color: '#9ca3af', textAlign: 'center', marginTop: '.5rem' }}>
              Order confirmation email will be sent to customer automatically.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
