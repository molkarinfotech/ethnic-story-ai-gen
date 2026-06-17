'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────
type Variant = { id: string; size: string; stock_count: number; price?: number };

type Product = {
  id: string;
  name: string;
  price: number;
  image?: string;
  in_stock?: boolean;
  stock_count?: number;
  variants?: Variant[];
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantLabel?: string; // e.g. "Red / M" shown in cart
  size?: string;         // kept for stock-decrement lookup
  colour?: string;
  image?: string;
};

type PaymentMethod = 'cash' | 'eftpos' | 'payid';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const PAYMENT_OPTIONS: { value: PaymentMethod; icon: string; label: string; colour: string }[] = [
  { value: 'cash',   icon: '\uD83D\uDCB5', label: 'Cash',         colour: '#16a34a' },
  { value: 'eftpos', icon: '\uD83C\uDFE7', label: 'EFTPOS',       colour: '#2563eb' },
  { value: 'payid',  icon: '\uD83D\uDCF2', label: 'PayID / Bank', colour: '#7c3aed' },
];

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const labelSm: React.CSSProperties = {
  display: 'block', fontSize: '.72rem', fontWeight: 700,
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3,
};
const inputSm: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
  borderRadius: 7, fontSize: '.88rem', boxSizing: 'border-box',
};

// Derive distinct values for a given attribute key from variants
// Variants may look like: size="Red / M" or size="XL" (we keep whatever string is stored)
function variantField(variants: Variant[], field: 'size'): string[] {
  const seen = new Set<string>();
  variants.forEach(v => { if (v[field]) seen.add(v[field]); });
  return Array.from(seen);
}

// ─── Product search panel ────────────────────────────────────────────────
function ProductSearch({ onAdd }: { onAdd: (item: CartItem) => void }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [varLoading, setVarLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>(''); // variant id
  const [qty, setQty]           = useState(1);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  // When a product is clicked: fetch its full detail (with variants)
  async function selectProduct(p: Product) {
    setSelected(p);
    setVariants([]);
    setSelectedVariant('');
    setQty(1);
    setResults([]);
    setQuery('');
    setVarLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`);
      if (res.ok) {
        const detail: Product = await res.json();
        const v = detail.variants ?? [];
        setVariants(v);
        // Pre-select the first variant
        if (v.length > 0) setSelectedVariant(v[0].id);
        // Use variant price if available
        setSelected({ ...detail });
      }
    } catch { /* ignore */ } finally {
      setVarLoading(false);
    }
  }

  function addToCart() {
    if (!selected) return;

    const chosenVariant = variants.find(v => v.id === selectedVariant);
    const price = chosenVariant?.price ?? selected.price;

    onAdd({
      productId:     selected.id,
      name:          selected.name,
      price,
      quantity:      qty,
      size:          chosenVariant?.size,
      variantLabel:  chosenVariant?.size ?? undefined,
      image:         selected.image,
    });
    setSelected(null);
    setVariants([]);
    setSelectedVariant('');
    setQty(1);
  }

  const chosenVariant = variants.find(v => v.id === selectedVariant);
  const stockForChosen = chosenVariant?.stock_count ?? selected?.stock_count ?? null;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: '.6rem' }}>Add product</div>

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by product name\u2026"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '.9rem', boxSizing: 'border-box' }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '.75rem', color: '#9ca3af' }}>searching\u2026</span>
        )}
      </div>

      {/* Dropdown results */}
      {results.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, overflow: 'hidden', maxHeight: 280, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
          {results.map(p => (
            <div key={p.id}
              onClick={() => selectProduct(p)}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', background: '#fff', transition: 'background .1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              {p.image
                ? <img src={p.image} alt={p.name} style={{ width: 42, height: 42, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 42, height: 42, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>&#x1F9F5;</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>{fmt(p.price)}</div>
              </div>
              {!p.in_stock && (
                <span style={{ fontSize: '.7rem', background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>Out of stock</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected product + variant picker */}
      {selected && (
        <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: '#fdf8f4', borderRadius: 10, border: '1px solid #fce7f3' }}>

          {/* Product header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {selected.image
              ? <img src={selected.image} alt={selected.name} style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 54, height: 54, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>&#x1F9F5;</div>
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{selected.name}</div>
              <div style={{ fontSize: '.82rem', color: '#9d174d', fontWeight: 700 }}>{fmt(chosenVariant?.price ?? selected.price)}</div>
            </div>
            <button onClick={() => { setSelected(null); setVariants([]); setSelectedVariant(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem', lineHeight: 1, padding: '4px' }}>\u00D7</button>
          </div>

          {/* Loading variants */}
          {varLoading && (
            <div style={{ fontSize: '.82rem', color: '#9ca3af', marginBottom: '1rem' }}>Loading variants\u2026</div>
          )}

          {/* Variant selector — shown when variants exist */}
          {!varLoading && variants.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelSm}>Variant / Size</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                {variants.map(v => {
                  const isSelected = v.id === selectedVariant;
                  const outOfStock = (v.stock_count ?? 0) <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => setSelectedVariant(v.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 7,
                        border: `2px solid ${isSelected ? '#9d174d' : outOfStock ? '#f3f4f6' : '#e5e7eb'}`,
                        background: isSelected ? '#9d174d' : outOfStock ? '#f9fafb' : '#fff',
                        color: isSelected ? '#fff' : outOfStock ? '#d1d5db' : '#1a1a1a',
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '.82rem',
                        transition: 'all .12s',
                      }}>
                      {v.size}
                      {outOfStock && <span style={{ fontSize: '.7rem', marginLeft: 4, opacity: .6 }}>(sold out)</span>}
                    </button>
                  );
                })}
              </div>
              {stockForChosen !== null && stockForChosen > 0 && (
                <div style={{ fontSize: '.72rem', color: '#16a34a', marginTop: 5, fontWeight: 600 }}>
                  \u2713 {stockForChosen} in stock
                </div>
              )}
            </div>
          )}

          {/* No variants — show flat stock count */}
          {!varLoading && variants.length === 0 && selected.stock_count != null && (
            <div style={{ fontSize: '.78rem', color: (selected.stock_count ?? 0) > 0 ? '#16a34a' : '#dc2626', marginBottom: '1rem', fontWeight: 600 }}>
              {(selected.stock_count ?? 0) > 0 ? `\u2713 ${selected.stock_count} in stock` : '\u26A0\uFE0F Out of stock'}
            </div>
          )}

          {/* Qty + add row */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 90px' }}>
              <label style={labelSm}>Quantity</label>
              <input
                type="number" min={1} max={stockForChosen ?? 99} value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={inputSm}
              />
            </div>
            <button
              type="button"
              onClick={addToCart}
              disabled={variants.length > 0 && !selectedVariant}
              style={{
                flex: 1, padding: '9px 0', background: '#9d174d', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontWeight: 700, fontSize: '.9rem',
              }}>
              + Add to order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cart ────────────────────────────────────────────────────────────────────
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
        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>&#x1F6D2;</div>
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
            : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>&#x1F9F5;</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{item.name}</div>
            {item.variantLabel && (
              <div style={{ fontSize: '.72rem', color: '#6b7280', marginTop: 2 }}>{item.variantLabel}</div>
            )}
          </div>
          <input
            type="number" min={1} max={99} value={item.quantity}
            onChange={e => onQtyChange(idx, Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: 54, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center', fontSize: '.88rem', flexShrink: 0 }}
          />
          <div style={{ fontWeight: 700, color: '#9d174d', fontSize: '.9rem', flexShrink: 0, minWidth: 64, textAlign: 'right' }}>{fmt(item.price * item.quantity)}</div>
          <button onClick={() => onRemove(idx)}
            style={{ background: '#fee2e2', border: 'none', color: '#991b1b', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>\u00D7</button>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontWeight: 800, fontSize: '1.05rem' }}>
        <span>Subtotal</span>
        <span style={{ color: '#9d174d' }}>{fmt(subtotal)}</span>
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
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem' }}>&#x2714;&#xFE0F;</div>
      <h2 style={{ fontFamily: 'Georgia, serif', color: '#9d174d', margin: '0 0 .5rem' }}>Order placed!</h2>
      <p style={{ color: '#6b7280', margin: '0 0 1.5rem' }}>Confirmation sent to <strong>{customerEmail}</strong></p>

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
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#9d174d' }}>{fmt(total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af', fontSize: '.85rem' }}>Payment</span>
          <span style={{ fontWeight: 700, fontSize: '.85rem', color: pm?.colour }}>{pm?.icon} {pm?.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/admin/orders"
          style={{ padding: '10px 24px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 700, fontSize: '.88rem', textDecoration: 'none', color: '#1a1a1a' }}>
          View in orders \u2192
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
  const [cartItems, setCartItems]   = useState<CartItem[]>([]);
  const [paymentMethod, setPayment] = useState<PaymentMethod>('cash');
  const [shippingCost, setShipping] = useState<number>(0);
  const [shippingEnabled, setShipEn] = useState(false);
  const [notes, setNotes]           = useState('');

  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [phone, setPhone]   = useState('');
  const [line1, setLine1]   = useState('');
  const [line2, setLine2]   = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState]   = useState('');
  const [postcode, setPost] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState<{ orderId: string } | null>(null);

  const subtotal   = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const grandTotal = subtotal + (shippingEnabled ? shippingCost : 0);

  function addItem(item: CartItem) {
    setCartItems(prev => {
      const key = `${item.productId}__${item.size ?? ''}`;
      const existingIdx = prev.findIndex(i => `${i.productId}__${i.size ?? ''}` === key);
      if (existingIdx >= 0) {
        return prev.map((i, idx) => idx === existingIdx ? { ...i, quantity: i.quantity + item.quantity } : i);
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
      id:       i.productId,
      name:     i.name,
      quantity: i.quantity,
      price:    i.price,
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
        customer_phone:    phone    || undefined,
        shipping_line1:    line1    || undefined,
        shipping_line2:    line2    || undefined,
        shipping_suburb:   suburb   || undefined,
        shipping_state:    state    || undefined,
        shipping_postcode: postcode || undefined,
        amount_aud:        grandTotal,
        shipping_cost:     shippingEnabled ? shippingCost : 0,
        notes:             notes    || undefined,
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
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#9d174d', margin: 0, fontSize: '1.75rem' }}>&#x1F6D2; In-Store Checkout</h1>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '.85rem' }}>Create orders for cash, EFTPOS, or PayID payments</p>
        </div>
        <a href="/admin/orders" style={{ marginLeft: 'auto', padding: '8px 18px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: '.85rem', textDecoration: 'none', color: '#374151' }}>
          \u2190 Orders
        </a>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Left column */}
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
                      <option value="">Select\u2026</option>
                      {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSm}>Postcode</label>
                    <input value={postcode} onChange={e => setPost(e.target.value)} placeholder="3000" maxLength={4} style={inputSm} />
                  </div>
                </div>
              </details>

              <div style={{ marginTop: '1rem' }}>
                <label style={labelSm}>Internal notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="e.g. customer picked up in store, awaiting PayID confirmation\u2026"
                  style={{ ...inputSm, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* Right column — sticky payment + total */}
          <div style={{ position: 'sticky', top: '1.5rem' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: '.75rem' }}>Payment method</div>
              {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPayment(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    width: '100%', padding: '12px 16px',
                    border: `2px solid ${paymentMethod === opt.value ? opt.colour : '#e5e7eb'}`,
                    borderRadius: 10, background: paymentMethod === opt.value ? `${opt.colour}18` : '#fff',
                    cursor: 'pointer', marginBottom: '.5rem', textAlign: 'left', transition: 'all .15s',
                  }}>
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{opt.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '.92rem', color: paymentMethod === opt.value ? opt.colour : '#1a1a1a' }}>{opt.label}</span>
                  {paymentMethod === opt.value && <span style={{ marginLeft: 'auto', color: opt.colour, fontWeight: 700, fontSize: '1.1rem' }}>\u2713</span>}
                </button>
              ))}
              {paymentMethod === 'payid' && (
                <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '10px 14px', fontSize: '.8rem', color: '#7c3aed', lineHeight: 1.5 }}>
                  Remind customer to transfer to <strong>orders@ethnicstory.com.au</strong> using their email as the reference.
                </div>
              )}
            </div>

            {/* Shipping */}
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

            {/* Total */}
            <div style={{ background: '#fdf2f8', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', fontSize: '.88rem', color: '#6b7280' }}>
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {shippingEnabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', fontSize: '.88rem', color: '#6b7280' }}>
                  <span>Shipping</span><span>{fmt(shippingCost)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '.75rem', borderTop: '2px solid #fce7f3', fontWeight: 800, fontSize: '1.2rem', color: '#9d174d' }}>
                <span>Total</span><span>{fmt(grandTotal)}</span>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: '.85rem', marginBottom: '1rem' }}>{error}</div>
            )}

            <button type="submit" disabled={submitting || cartItems.length === 0}
              style={{
                width: '100%', padding: '14px',
                background: cartItems.length === 0 ? '#e5e7eb' : '#9d174d',
                color: cartItems.length === 0 ? '#9ca3af' : '#fff',
                border: 'none', borderRadius: 10,
                cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 800, fontSize: '1rem', letterSpacing: '.02em', transition: 'all .15s',
              }}>
              {submitting ? 'Placing order\u2026' : `\u2714 Confirm & send receipt \u00B7 ${fmt(grandTotal)}`}
            </button>
            <p style={{ fontSize: '.75rem', color: '#9ca3af', textAlign: 'center', marginTop: '.5rem' }}>
              Order confirmation email sent to customer automatically.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
