'use client';
import Link from 'next/link';
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

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  pending:    { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  processing: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  shipped:    { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  delivered:  { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  cancelled:  { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
};

/* ── Tiny SVG icons (subset) ──────────────────────────────────── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    revenue:     'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    orders:      'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 5h16M8 5V3M16 5V3',
    total:       'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 12h.01M12 16h.01M8 12h.01M8 16h.01M16 12h.01',
    stock:       'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    checkout:    'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    add:         'M12 5v14M5 12h14',
    scan:        'M23 7V3h-4M1 7V3h4M23 17v4h-4M1 17v4h4M7 12h10M12 7v10',
    import:      'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    arrow_right: 'M5 12h14M12 5l7 7-7 7',
    clock:       'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
    review:      'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
  };
  const d = paths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: 'white', borderRadius: '.75rem',
      border: '1px solid #fce7f3', padding: '1rem 1.1rem',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: '.5rem', background: '#f3e8f0', marginBottom: '.75rem', animation: 'shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }} />
      <div style={{ width: '45%', height: 28, borderRadius: '.35rem', background: '#f3e8f0', marginBottom: '.4rem', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      <div style={{ width: '70%', height: 12, borderRadius: '.25rem', background: '#f9f0f4', animation: 'shimmer 1.4s ease-in-out infinite' }} />
    </div>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);

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

  const todayOrders   = orders.filter(o => new Date(o.created_at) >= today);
  const todayRevenue  = todayOrders.reduce((s, o) => s + o.amount_aud, 0);
  const pendingOrders = orders.filter(o => (o.fulfillment_status ?? o.status) === 'pending');

  const lowStockProducts   = products.filter(p => { const t = p.variants.reduce((s, v) => s + (v.stock_count ?? 0), 0); return t > 0 && t <= 5; });
  const outOfStockProducts = products.filter(p => p.variants.reduce((s, v) => s + (v.stock_count ?? 0), 0) === 0);

  const recentOrders = orders.slice(0, 8);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #f3e8f0 25%, #fce7f3 50%, #f3e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }

        /* KPI cards */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: .75rem; margin-bottom: 1.5rem; }
        .kpi-card { background: white; border-radius: .75rem; border: 1px solid #fce7f3; padding: 1.1rem; transition: box-shadow .15s; }
        .kpi-card:hover { box-shadow: 0 4px 16px rgba(157,23,77,.08); }
        .kpi-icon { width: 36px; height: 36px; border-radius: .55rem; display: flex; align-items: center; justify-content: center; margin-bottom: .75rem; }
        .kpi-value { font-size: 1.45rem; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .kpi-label { font-size: .74rem; font-weight: 600; color: #374151; margin-top: .2rem; }
        .kpi-sub   { font-size: .68rem; color: #9ca3af; margin-top: .1rem; }

        /* Layout grid */
        .dash-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.25rem; align-items: start; }
        @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }

        /* Section card */
        .section-card { background: white; border-radius: .75rem; border: 1px solid #fce7f3; overflow: hidden; }
        .section-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #fce7f3; }
        .section-head-title { font-size: .84rem; font-weight: 700; color: #111827; }
        .section-view-all { font-size: .75rem; color: #9d174d; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: .3rem; }
        .section-view-all:hover { color: #831843; }
        .section-empty { padding: 2.5rem; text-align: center; color: #9ca3af; font-size: .85rem; }

        /* Order row */
        .order-row { display: flex; align-items: center; gap: .75rem; padding: .8rem 1.25rem; border-bottom: 1px solid #f9fafb; transition: background .1s; }
        .order-row:hover { background: #fdf2f8; }
        .order-row:last-child { border-bottom: none; }
        .order-id { font-family: 'SFMono-Regular', 'Consolas', monospace; font-weight: 700; font-size: .78rem; color: #111827; }
        .order-meta { font-size: .72rem; color: #9ca3af; margin-top: .15rem; }
        .order-badge { font-size: .62rem; font-weight: 700; border-radius: 2rem; padding: .1rem .45rem; text-transform: capitalize; display: inline-flex; align-items: center; gap: .25rem; }
        .order-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .order-amount { font-weight: 800; font-size: .88rem; color: #9d174d; font-variant-numeric: tabular-nums; }
        .order-time { font-size: .7rem; color: #9ca3af; margin-top: .1rem; text-align: right; }

        /* Quick actions */
        .quick-link { display: flex; align-items: center; gap: .65rem; padding: .55rem .8rem; border-radius: .55rem; background: #fdf2f8; text-decoration: none; font-size: .83rem; font-weight: 600; color: #9d174d; transition: background .12s, transform .1s; }
        .quick-link:hover { background: #fce7f3; transform: translateX(2px); }
        .quick-links { display: flex; flex-direction: column; gap: .45rem; }

        /* Stock alert row */
        .stock-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: .45rem; }
        .stock-name { font-size: .78rem; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; margin-right: .5rem; }
        .stock-badge { font-size: .63rem; font-weight: 700; border-radius: 2rem; padding: .12rem .45rem; flex-shrink: 0; }

        /* Pending block */
        .pending-block { background: #fef9c3; border-radius: .75rem; border: 1px solid #fde68a; padding: 1.1rem; }
        .pending-count { font-size: 2rem; font-weight: 900; color: #854d0e; line-height: 1; font-variant-numeric: tabular-nums; }
        .pending-label { font-size: .76rem; color: #92400e; margin: .15rem 0 .9rem; }
        .pending-btn { display: block; padding: .48rem .9rem; background: #854d0e; color: white; border-radius: .45rem; text-decoration: none; font-size: .79rem; font-weight: 700; text-align: center; transition: background .12s; }
        .pending-btn:hover { background: #713411; }

        /* Page header */
        .page-header { margin-bottom: 1.75rem; }
        .page-title { font-size: 1.35rem; font-weight: 800; color: #111827; margin: 0; letter-spacing: -.02em; }
        .page-date  { font-size: .78rem; color: #9ca3af; margin-top: .2rem; }
      `}</style>

      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-date">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI strip */}
      {loading ? (
        <div className="kpi-grid">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="kpi-grid">
          <KpiCard
            iconName="revenue" iconBg="#fdf2f8" iconColor="#9d174d"
            label="Revenue today" value={fmt(todayRevenue)}
            sub={`${todayOrders.length} order${todayOrders.length !== 1 ? 's' : ''} today`}
            accent="#9d174d"
          />
          <KpiCard
            iconName="orders" iconBg="#fef9c3" iconColor={pendingOrders.length > 0 ? '#854d0e' : '#15803d'}
            label="Pending orders" value={String(pendingOrders.length)}
            sub="need fulfilment"
            accent={pendingOrders.length > 0 ? '#854d0e' : '#15803d'}
          />
          <KpiCard
            iconName="total" iconBg="#dbeafe" iconColor="#1e40af"
            label="Total orders" value={String(orders.length)}
            sub="all time"
            accent="#1e40af"
          />
          <KpiCard
            iconName="stock" iconBg="#fee2e2" iconColor={lowStockProducts.length > 0 ? '#991b1b' : '#15803d'}
            label="Low stock" value={String(lowStockProducts.length)}
            sub={`${outOfStockProducts.length} out of stock`}
            accent={lowStockProducts.length > 0 ? '#991b1b' : '#15803d'}
          />
        </div>
      )}

      <div className="dash-grid">

        {/* Recent orders */}
        <div className="section-card">
          <div className="section-head">
            <span className="section-head-title">Recent orders</span>
            <Link href="/admin/orders" className="section-view-all">
              View all <Icon name="arrow_right" size={13} />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ height: 48, borderRadius: '.5rem' }} className="shimmer" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="section-empty">
              <Icon name="orders" size={32} />
              <p style={{ marginTop: '.5rem' }}>No orders yet — they&apos;ll appear here once customers start buying.</p>
            </div>
          ) : (
            recentOrders.map(o => {
              const fs = o.fulfillment_status ?? o.status ?? 'pending';
              const c  = STATUS_META[fs] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
              const itemCount = Array.isArray(o.items) ? o.items.reduce((s, i) => s + i.quantity, 0) : 0;
              return (
                <div key={o.id} className="order-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', flexWrap: 'wrap' }}>
                      <span className="order-id">#{o.id.slice(0,8).toUpperCase()}</span>
                      <span className="order-badge" style={{ background: c.bg, color: c.text }}>
                        <span className="order-dot" style={{ background: c.dot }} />
                        {fs}
                      </span>
                    </div>
                    <div className="order-meta">
                      {o.customer_name ?? 'Guest'} &middot; {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div className="order-amount">{fmt(o.amount_aud)}</div>
                    <div className="order-time">{timeAgo(o.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>

          {/* Quick actions */}
          <div className="section-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: '#9ca3af', marginBottom: '.8rem' }}>Quick actions</div>
            <div className="quick-links">
              <QuickLink href="/admin/checkout"     iconName="checkout" label="In-store checkout" />
              <QuickLink href="/admin/products/new" iconName="add"      label="Add new product" />
              <QuickLink href="/admin/orders"       iconName="orders"   label="Manage orders" />
              <QuickLink href="/admin/scan"         iconName="scan"     label="AI product scan" />
              <QuickLink href="/admin/import"       iconName="import"   label="Bulk import" />
            </div>
          </div>

          {/* Stock alerts */}
          {!loading && (lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
            <div className="section-card" style={{ padding: '1rem', borderColor: '#fef08a' }}>
              <div style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: '#854d0e', marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <Icon name="stock" size={13} /> Stock alerts
              </div>
              {outOfStockProducts.slice(0, 3).map(p => (
                <div key={p.id} className="stock-row">
                  <span className="stock-name">{p.name}</span>
                  <span className="stock-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>OOS</span>
                </div>
              ))}
              {lowStockProducts.slice(0, 4).map(p => {
                const total = p.variants.reduce((s, v) => s + (v.stock_count ?? 0), 0);
                return (
                  <div key={p.id} className="stock-row">
                    <span className="stock-name">{p.name}</span>
                    <span className="stock-badge" style={{ background: '#fef9c3', color: '#854d0e' }}>{total} left</span>
                  </div>
                );
              })}
              <Link href="/admin/products" style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginTop: '.6rem', fontSize: '.76rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none' }}>
                View all products <Icon name="arrow_right" size={12} />
              </Link>
            </div>
          )}

          {/* Pending orders */}
          {!loading && pendingOrders.length > 0 && (
            <div className="pending-block">
              <div style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: '#854d0e', marginBottom: '.6rem', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <Icon name="clock" size={13} /> Pending approval
              </div>
              <div className="pending-count">{pendingOrders.length}</div>
              <div className="pending-label">order{pendingOrders.length !== 1 ? 's' : ''} waiting</div>
              <Link href="/admin/orders" className="pending-btn">Review now →</Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */
function KpiCard({ iconName, iconBg, iconColor, label, value, sub, accent }: {
  iconName: string; iconBg: string; iconColor: string;
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon name={iconName} size={18} />
      </div>
      <div className="kpi-value" style={{ color: accent }}>{value}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function QuickLink({ href, iconName, label }: { href: string; iconName: string; label: string }) {
  return (
    <Link href={href} className="quick-link">
      <Icon name={iconName} size={15} />
      {label}
    </Link>
  );
}
