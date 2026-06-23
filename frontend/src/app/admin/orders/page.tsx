'use client';
import { useEffect, useState, useCallback } from 'react';

type OrderItem = {
  id: string;
  product_id?: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  colour?: string;
  slug?: string;
};

type Order = {
  id: string;
  created_at: string;
  status: string;
  fulfillment_status?: string;
  payment_method?: string;
  amount_aud: number;
  shipping_cost?: number;
  items: OrderItem[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  notes?: string;
  shipping_address?: { line1?: string; line2?: string; suburb?: string; state?: string; postcode?: string };
};

const FULFILLMENT_STATUSES = ['pending','processing','shipped','delivered','cancelled'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: '#fef9c3', text: '#854d0e' },
  processing: { bg: '#dbeafe', text: '#1e40af' },
  shipped:    { bg: '#d1fae5', text: '#065f46' },
  delivered:  { bg: '#dcfce7', text: '#15803d' },
  cancelled:  { bg: '#fee2e2', text: '#991b1b' },
  paid:       { bg: '#ede9fe', text: '#6d28d9' },
};

const PAYMENT_LABELS: Record<string, string> = {
  card: '💳 Card', cash: '💵 Cash', eftpos: '🏧 EFTPOS', payid: '📲 PayID',
};

// Next status in the approval flow
const NEXT_STATUS: Record<string, string | null> = {
  pending:    'processing',
  processing: 'shipped',
  shipped:    'delivered',
  delivered:  null,
  cancelled:  null,
};

const NEXT_LABEL: Record<string, string> = {
  pending:    '✓ Approve',
  processing: '📦 Mark shipped',
  shipped:    '✓ Delivered',
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{ background: c.bg, color: c.text, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function formatAUD(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '.9rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', marginTop: '1rem' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: '.6rem' }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '.5rem', fontSize: '.85rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
      <span style={{ color: '#9ca3af', minWidth: 60 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function productLink(item: OrderItem): { href: string; label: string } {
  if (item.product_id) return { href: `/admin/products/${item.product_id}/edit`, label: `${item.name} ↗` };
  if (item.slug) return { href: `/products/${item.slug}`, label: `${item.name} ↗` };
  return { href: '/admin/products', label: item.name };
}

function OrderModal({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (updated: Order) => void }) {
  const [status,   setStatus]   = useState(order.fulfillment_status ?? order.status ?? 'pending');
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [carrier,  setCarrier]  = useState(order.shipping_carrier ?? '');
  const [notes,    setNotes]    = useState(order.notes ?? '');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  async function handleSave() {
    setSaving(true); setErr('');
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fulfillment_status: status, tracking_number: tracking, shipping_carrier: carrier, notes }),
    });
    if (res.ok) { onSave(await res.json()); onClose(); }
    else { const d = await res.json(); setErr(d.error ?? 'Save failed'); }
    setSaving(false);
  }

  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
  const addr = order.shipping_address ?? {};
  const addrStr = [addr.line1, addr.line2, addr.suburb, addr.state, addr.postcode].filter(Boolean).join(', ');

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', color: '#9d174d', fontSize: '1.2rem' }}>
              Order #{order.id.slice(0,8).toUpperCase()}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '.8rem', color: '#9ca3af' }}>
              {new Date(order.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>

        <Section title="Customer">
          <Row label="Name"    value={order.customer_name  ?? '—'} />
          <Row label="Email"   value={order.customer_email ?? '—'} />
          <Row label="Phone"   value={order.customer_phone ?? '—'} />
          {addrStr && <Row label="Ship to" value={addrStr} />}
        </Section>

        <Section title="Items">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', color: '#9ca3af', fontWeight: 600 }}>Product</th>
                <th style={{ textAlign: 'center', padding: '6px 4px', color: '#9ca3af', fontWeight: 600 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '6px 0', color: '#9ca3af', fontWeight: 600 }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const variant = [item.size, item.colour].filter(Boolean).join(' / ');
                const link = productLink(item);
                const hasLink = !!(item.product_id || item.slug);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '8px 0' }}>
                      {hasLink ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer"
                          style={{ fontWeight: 600, color: '#9d174d', textDecoration: 'none', fontSize: '.88rem' }}>
                          {link.label}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '.88rem' }}>{item.name}</span>
                      )}
                      {variant && <div style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: 2 }}>{variant}</div>}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 4px', color: '#6b7280' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: '#9d174d' }}>{formatAUD(item.price * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {order.shipping_cost !== undefined && (
                <tr>
                  <td colSpan={2} style={{ paddingTop: 10, fontSize: '.8rem', color: '#9ca3af' }}>Shipping</td>
                  <td style={{ paddingTop: 10, textAlign: 'right', fontSize: '.8rem', color: '#9ca3af' }}>{order.shipping_cost === 0 ? 'FREE' : formatAUD(order.shipping_cost)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid #f3f4f6' }}>
                <td colSpan={2} style={{ paddingTop: 10, fontWeight: 700 }}>Total</td>
                <td style={{ paddingTop: 10, textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#9d174d' }}>{formatAUD(order.amount_aud)}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ paddingTop: 4, fontSize: '.78rem', color: '#9ca3af' }}>Payment</td>
                <td style={{ paddingTop: 4, textAlign: 'right', fontSize: '.78rem', color: '#9ca3af' }}>{PAYMENT_LABELS[order.payment_method ?? ''] ?? (order.payment_method ?? '—')}</td>
              </tr>
            </tfoot>
          </table>
        </Section>

        <Section title="Fulfilment">
          {/* Quick-approve buttons */}
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {FULFILLMENT_STATUSES.map(s => {
              const c = STATUS_COLORS[s] ?? { bg: '#f3f4f6', text: '#374151' };
              const active = status === s;
              return (
                <button key={s} onClick={() => setStatus(s)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: `2px solid ${active ? c.text : '#e5e7eb'}`, background: active ? c.bg : '#fff', color: active ? c.text : '#6b7280', fontWeight: active ? 700 : 500, fontSize: '.78rem', cursor: 'pointer', textTransform: 'capitalize', transition: 'all .12s' }}>
                  {s}
                </button>
              );
            })}
          </div>

          <label style={labelStyle}>Carrier</label>
          <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Australia Post, StarTrack" style={inputStyle} />
          <label style={{ ...labelStyle, marginTop: 12 }}>Tracking number</label>
          <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="e.g. 7X0000000000" style={inputStyle} />
          {tracking && (
            <div style={{ marginTop: 6, fontSize: '.75rem' }}>
              <a href={`https://auspost.com.au/mypost/track/#/search?trackingId=${tracking}`} target="_blank" rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>🔍 Track with Australia Post ↗</a>
            </div>
          )}
          <label style={{ ...labelStyle, marginTop: 12 }}>Internal notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes visible only to admin…" rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </Section>

        {err && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: '.85rem', marginTop: '1rem' }}>{err}</div>}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: 8, background: '#9d174d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: saving ? .6 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders,        setOrders]   = useState<Order[]>([]);
  const [loading,       setLoading]  = useState(true);
  const [error,         setError]    = useState('');
  const [search,        setSearch]   = useState('');
  const [filterStatus,  setFilter]   = useState('all');
  const [filterPayment, setFilterP]  = useState('all');
  const [selected,      setSelected] = useState<Order | null>(null);
  const [selectedIds,   setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving,    setBulkSaving]  = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/orders');
    if (res.ok) setOrders(await res.json());
    else setError('Failed to load orders');
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function handleSave(updated: Order) {
    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(updated.id); return n; });
  }

  // Quick inline status advance (one-click approve/ship)
  async function quickAdvance(order: Order, e: React.MouseEvent) {
    e.stopPropagation();
    const fs = order.fulfillment_status ?? order.status ?? 'pending';
    const next = NEXT_STATUS[fs];
    if (!next) return;
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fulfillment_status: next }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
    }
  }

  // Bulk status change
  async function bulkSetStatus(newStatus: string) {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id =>
      fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillment_status: newStatus }),
      }).then(r => r.ok ? r.json() : null)
        .then(updated => { if (updated) setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o)); })
    ));
    setSelectedIds(new Set());
    setBulkSaving(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const filtered = orders.filter(o => {
    const fs = o.fulfillment_status ?? o.status ?? '';
    const matchStatus  = filterStatus  === 'all' || fs === filterStatus;
    const matchPayment = filterPayment === 'all' || (o.payment_method ?? 'card') === filterPayment;
    const q = search.toLowerCase();
    const matchSearch = !q || (o.customer_name?.toLowerCase().includes(q)) || (o.customer_email?.toLowerCase().includes(q)) || o.id.toLowerCase().includes(q);
    return matchStatus && matchPayment && matchSearch;
  });

  const counts = FULFILLMENT_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter(o => (o.fulfillment_status ?? o.status) === s).length;
    return acc;
  }, {});

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(o => n.delete(o.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(o => n.add(o.id)); return n; });
    }
  }

  return (
    <div style={{ padding: '1rem', fontFamily: "'Helvetica Neue', Arial, sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @media (max-width: 640px) {
          .orders-table-row { grid-template-columns: 1fr 1fr !important; gap: .5rem !important; }
          .orders-table-row .col-customer { grid-column: 1 / -1; }
          .orders-table-row .col-items { display: none !important; }
          .orders-table-header { display: none !important; }
          .status-cards { gap: .4rem !important; }
          .status-card { padding: 8px 10px !important; min-width: 0 !important; }
          .filter-row { flex-direction: column !important; }
          .filter-row input, .filter-row select, .filter-row button { width: 100% !important; box-sizing: border-box; }
        }
      `}</style>

      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#9d174d', margin: 0, fontSize: '1.5rem' }}>Orders</h1>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '.8rem' }}>
            {orders.length} total · {new Date().toLocaleTimeString('en-AU')}
          </p>
        </div>
        <a href="/admin/checkout" style={{ padding: '9px 18px', background: '#9d174d', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '.85rem' }}>
          + In-store order
        </a>
      </div>

      {/* Status filter cards */}
      <div className="status-cards" style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {FULFILLMENT_STATUSES.map(s => {
          const c = STATUS_COLORS[s];
          return (
            <button key={s} className="status-card" onClick={() => setFilter(filterStatus === s ? 'all' : s)}
              style={{ background: filterStatus === s ? c.bg : '#fff', border: `2px solid ${filterStatus === s ? c.text : '#e5e7eb'}`, borderRadius: 10, padding: '10px 16px', cursor: 'pointer', transition: 'all .15s', textAlign: 'left' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: filterStatus === s ? c.text : '#1a1a1a' }}>{counts[s] ?? 0}</div>
              <div style={{ fontSize: '.68rem', fontWeight: 700, color: c.text, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{s}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="filter-row" style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search name, email, order ID…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '.9rem', minWidth: 0 }}
        />
        <select value={filterPayment} onChange={e => setFilterP(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '.88rem', flexShrink: 0 }}>
          <option value="all">All payments</option>
          <option value="card">💳 Card</option>
          <option value="cash">💵 Cash</option>
          <option value="eftpos">🏧 EFTPOS</option>
          <option value="payid">📲 PayID</option>
        </select>
        <button onClick={fetchOrders}
          style={{ padding: '9px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', flexShrink: 0 }}>
          ↻ Refresh
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ background: '#fdf2f8', border: '1.5px solid #fce7f3', borderRadius: 10, padding: '.6rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#9d174d' }}>{selectedIds.size} selected</span>
          <span style={{ color: '#fce7f3' }}>|</span>
          <span style={{ fontSize: '.78rem', color: '#6b7280' }}>Mark all as:</span>
          {['processing','shipped','delivered','cancelled'].map(s => {
            const c = STATUS_COLORS[s];
            return (
              <button key={s} disabled={bulkSaving} onClick={() => bulkSetStatus(s)}
                style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${c.text}`, background: c.bg, color: c.text, fontWeight: 700, fontSize: '.75rem', cursor: 'pointer', textTransform: 'capitalize', opacity: bulkSaving ? .6 : 1 }}>
                {s}
              </button>
            );
          })}
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '.8rem' }}>✕ Clear</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>Loading orders…</div>
      ) : error ? (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 8 }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📦</div>
          <p style={{ fontWeight: 600 }}>No orders match your filters</p>
          {(search || filterStatus !== 'all') && (
            <button onClick={() => { setSearch(''); setFilter('all'); setFilterP('all'); }}
              style={{ marginTop: '.75rem', padding: '8px 16px', background: '#9d174d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
          {/* Table header */}
          <div className="orders-table-header" style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1.4fr .9fr .8fr .7fr auto auto', gap: '.75rem', padding: '10px 16px', background: '#fdf8f4', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll}
              style={{ accentColor: '#9d174d', cursor: 'pointer' }} />
            <span>Order</span><span>Customer</span><span>Items</span><span>Total</span><span>Status</span><span>Approve</span><span></span>
          </div>

          {filtered.map(order => {
            const fs = order.fulfillment_status ?? order.status ?? 'pending';
            const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
            const itemSummary = items.length === 1
              ? `${items[0].name}${[items[0].size, items[0].colour].filter(Boolean).map(v => ` (${v})`).join('')}`
              : `${items.length} items`;
            const nextS = NEXT_STATUS[fs];
            const isChecked = selectedIds.has(order.id);

            return (
              <div key={order.id} className="orders-table-row"
                style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1.4fr .9fr .8fr .7fr auto auto', gap: '.75rem', padding: '12px 16px', borderBottom: '1px solid #f9fafb', alignItems: 'center', transition: 'background .1s', background: isChecked ? '#fdf2f8' : undefined }}
                onMouseEnter={e => { if (!isChecked) (e.currentTarget.style.background = '#fdf8f4'); }}
                onMouseLeave={e => { if (!isChecked) (e.currentTarget.style.background = ''); }}>

                <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(order.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor: '#9d174d', cursor: 'pointer' }} />

                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.82rem' }}>#{order.id.slice(0,8).toUpperCase()}</div>
                  <div style={{ fontSize: '.7rem', color: '#9ca3af', marginTop: 2 }}>{timeAgo(order.created_at)}</div>
                  {order.payment_method && (
                    <div style={{ fontSize: '.68rem', color: '#9ca3af', marginTop: 1 }}>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</div>
                  )}
                  {order.tracking_number && (
                    <div style={{ fontSize: '.68rem', color: '#2563eb', marginTop: 2 }}>🚚 tracked</div>
                  )}
                </div>

                <div className="col-customer">
                  <div style={{ fontWeight: 600, fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customer_name ?? '—'}</div>
                  <div style={{ fontSize: '.72rem', color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customer_email ?? ''}</div>
                </div>

                <div className="col-items" style={{ fontSize: '.8rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemSummary}</div>

                <div style={{ fontWeight: 700, color: '#9d174d', fontSize: '.88rem' }}>{formatAUD(order.amount_aud)}</div>

                <StatusBadge status={fs} />

                {/* Quick-advance button */}
                {nextS ? (
                  <button onClick={e => quickAdvance(order, e)}
                    style={{ padding: '5px 10px', background: STATUS_COLORS[nextS]?.bg ?? '#f3f4f6', color: STATUS_COLORS[nextS]?.text ?? '#374151', border: `1.5px solid ${STATUS_COLORS[nextS]?.text ?? '#e5e7eb'}`, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.72rem', whiteSpace: 'nowrap' }}>
                    {NEXT_LABEL[fs] ?? `→ ${nextS}`}
                  </button>
                ) : (
                  <span style={{ fontSize: '.72rem', color: '#9ca3af' }}>{fs === 'delivered' ? '✓ Done' : '—'}</span>
                )}

                <button onClick={() => setSelected(order)}
                  style={{ padding: '7px 12px', background: '#9d174d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                  Manage
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} onSave={handleSave} />}
    </div>
  );
}
