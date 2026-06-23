'use client';
import { useEffect, useState } from 'react';

type Order = {
  id: string;
  created_at: string;
  status: string;
  fulfillment_status?: string;
  amount_aud: number;
  customer_name?: string;
  items: { name: string; quantity: number; price: number }[];
};

type Product = {
  id: string;
  name: string;
  variants: { stock_count: number }[];
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: '#fef9c3', text: '#854d0e' },
  processing: { bg: '#dbeafe', text: '#1e40af' },
  shipped:    { bg: '#d1fae5', text: '#065f46' },
  delivered:  { bg: '#dcfce7', text: '#15803d' },
  cancelled:  { bg: '#fee2e2', text: '#991b1b' },
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/stock').then(r => r.json()),
    ]).then(([o, p]) => {
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(p) ? p : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.amount_aud, 0);
  const pendingOrders = orders.filter(o => (o.fulfillment_status ?? o.status) === 'pending');

  // Low stock = any product where total variant stock <= 5
  const lowStockProducts = products.filter(p => {
    const total = p.variants.reduce((s, v) => s + (v.stock_count ?? 0), 0);
    return total > 0 && total <= 5;
  });
  const outOfStockProducts = products.filter(p => {
    const total = p.variants.reduce((s, v) => s + (v.stock_count ?? 0), 0);
    return total === 0;
  });

  const recentOrders = orders.slice(0, 8);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📊</div>
        <p>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: '.78rem', color: '#9ca3af', marginTop: '.15rem' }}>
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
        <KpiCard icon="💰" label="Revenue today" value={fmt(todayRevenue)} sub={`${todayOrders.length} order${todayOrders.length !== 1 ? 's' : ''}`} accent="#9d174d" />
        <KpiCard icon="📦" label="Pending orders" value={String(pendingOrders.length)} sub="need attention" accent={pendingOrders.length > 0 ? '#854d0e' : '#15803d'} />
        <KpiCard icon="📋" label="Total orders" value={String(orders.length)} sub="all time" accent="#1e40af" />
        <KpiCard icon="⚠️" label="Low stock" value={String(lowStockProducts.length)} sub={`${outOfStockProducts.length} out of stock`} accent={lowStockProducts.length > 0 ? '#854d0e' : '#15803d'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem', alignItems: 'start' }}>

        {/* Recent orders */}
        <div style={{ background: 'white', borderRadius: '.75rem', border: '1px solid #fce7f3', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #fce7f3' }}>
            <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#111827' }}>Recent orders</div>
            <a href="/admin/orders" style={{ fontSize: '.75rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '.85rem' }}>No orders yet</div>
          ) : (
            recentOrders.map(o => {
              const fs = o.fulfillment_status ?? o.status ?? 'pending';
              const c = STATUS_COLORS[fs] ?? { bg: '#f3f4f6', text: '#374151' };
              const itemCount = Array.isArray(o.items) ? o.items.reduce((s, i) => s + i.quantity, 0) : 0;
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 1.25rem', borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.78rem', color: '#111827' }}>#{o.id.slice(0,8).toUpperCase()}</span>
                      <span style={{ background: c.bg, color: c.text, fontSize: '.62rem', fontWeight: 700, borderRadius: '2rem', padding: '.1rem .4rem', textTransform: 'capitalize' }}>{fs}</span>
                    </div>
                    <div style={{ fontSize: '.72rem', color: '#9ca3af', marginTop: '.15rem' }}>
                      {o.customer_name ?? '—'} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#9d174d' }}>{fmt(o.amount_aud)}</div>
                    <div style={{ fontSize: '.7rem', color: '#9ca3af' }}>{timeAgo(o.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right sidebar: quick links + stock alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>

          {/* Quick actions */}
          <div style={{ background: 'white', borderRadius: '.75rem', border: '1px solid #fce7f3', padding: '1rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af', marginBottom: '.75rem' }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <QuickLink href="/admin/checkout" icon="🛒" label="In-store checkout" />
              <QuickLink href="/admin/products/new" icon="➕" label="Add new product" />
              <QuickLink href="/admin/orders" icon="📦" label="Manage orders" />
              <QuickLink href="/admin/scan" icon="📷" label="AI product scan" />
              <QuickLink href="/admin/import" icon="📥" label="Bulk import" />
            </div>
          </div>

          {/* Stock alerts */}
          {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
            <div style={{ background: 'white', borderRadius: '.75rem', border: '1px solid #fef08a', padding: '1rem' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#854d0e', marginBottom: '.75rem' }}>⚠️ Stock alerts</div>
              {outOfStockProducts.slice(0, 3).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                  <span style={{ fontSize: '.78rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, marginRight: '.5rem' }}>{p.name}</span>
                  <span style={{ fontSize: '.65rem', background: '#fee2e2', color: '#991b1b', borderRadius: '2rem', padding: '.1rem .4rem', fontWeight: 700, flexShrink: 0 }}>OOS</span>
                </div>
              ))}
              {lowStockProducts.slice(0, 4).map(p => {
                const total = p.variants.reduce((s, v) => s + (v.stock_count ?? 0), 0);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                    <span style={{ fontSize: '.78rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, marginRight: '.5rem' }}>{p.name}</span>
                    <span style={{ fontSize: '.65rem', background: '#fef9c3', color: '#854d0e', borderRadius: '2rem', padding: '.1rem .4rem', fontWeight: 700, flexShrink: 0 }}>{total} left</span>
                  </div>
                );
              })}
              <a href="/admin/products" style={{ display: 'block', marginTop: '.5rem', fontSize: '.75rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none' }}>View all products →</a>
            </div>
          )}

          {/* Pending orders quick block */}
          {pendingOrders.length > 0 && (
            <div style={{ background: '#fef9c3', borderRadius: '.75rem', border: '1px solid #fde68a', padding: '1rem' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#854d0e', marginBottom: '.5rem' }}>⏳ Pending approval</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#854d0e' }}>{pendingOrders.length}</div>
              <div style={{ fontSize: '.75rem', color: '#92400e', marginBottom: '.75rem' }}>order{pendingOrders.length !== 1 ? 's' : ''} waiting</div>
              <a href="/admin/orders" style={{ display: 'block', padding: '.45rem .85rem', background: '#854d0e', color: 'white', borderRadius: '.45rem', textDecoration: 'none', fontSize: '.78rem', fontWeight: 700, textAlign: 'center' }}>Review now →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ background: 'white', borderRadius: '.75rem', border: '1px solid #fce7f3', padding: '1rem 1.1rem' }}>
      <div style={{ fontSize: '1.3rem', marginBottom: '.35rem' }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: accent }}>{value}</div>
      <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#111827', marginTop: '.1rem' }}>{label}</div>
      <div style={{ fontSize: '.68rem', color: '#9ca3af', marginTop: '.15rem' }}>{sub}</div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} style={{ display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.5rem .75rem', borderRadius: '.5rem', background: '#fdf2f8', textDecoration: 'none', fontSize: '.82rem', fontWeight: 600, color: '#9d174d', transition: 'background .12s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fce7f3')}
      onMouseLeave={e => (e.currentTarget.style.background = '#fdf2f8')}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      {label}
    </a>
  );
}
