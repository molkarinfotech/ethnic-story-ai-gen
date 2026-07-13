'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { formatAUD } from '../../lib/products';
import RewardsWidget from '../../components/RewardsWidget';

type OrderItem = {
  id: string; slug?: string; name: string; quantity: number;
  price: number; size?: string; image?: string;
};
type Order = {
  id: string; created_at: string; amount_aud: number; status: string;
  items: OrderItem[]; customer_name?: string; customer_email?: string; customer_phone?: string;
  shipping_address?: { line1?: string; line2?: string; suburb?: string; state?: string; postcode?: string };
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  paid:       { bg: '#dcfce7', color: '#16a34a', label: 'Paid' },
  processing: { bg: '#fef9c3', color: '#ca8a04', label: 'Processing' },
  shipped:    { bg: '#dbeafe', color: '#2563eb', label: 'Shipped' },
  delivered:  { bg: '#ede9fe', color: '#7c3aed', label: 'Delivered' },
  cancelled:  { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
};

type Tab = 'orders' | 'rewards';

export default function AccountPage() {
  const router = useRouter();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async (token: string, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setOrdersLoading(true);
    setError('');
    try {
      const res = await fetch('/api/account/orders', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
      else setError(data.error ?? 'Failed to load orders');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setOrdersLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) { router.push('/login'); return; }
    fetchOrders(session.access_token);
  }, [authLoading, user, session, router, fetchOrders]);

  // Read ?tab=rewards from URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'rewards') setTab('rewards');
  }, []);

  if (authLoading || ordersLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading your account…</main>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)' }}>
      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', textDecoration: 'none' }}>Ethnic Story</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{user?.email}</span>
          <button onClick={signOut} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        {/* Tab strip */}
        <div style={{
          display: 'flex', gap: '.5rem', marginBottom: '1.75rem',
          borderBottom: '2px solid var(--color-border)', paddingBottom: '.75rem',
        }}>
          {([
            { key: 'orders',  label: '📦 My Orders' },
            { key: 'rewards', label: '🌟 My Rewards' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '.45rem 1.1rem',
                borderRadius: '2rem',
                border: 'none',
                background: tab === key ? 'var(--color-primary)' : 'transparent',
                color: tab === key ? '#fff' : 'var(--color-text-muted)',
                fontWeight: tab === key ? 700 : 500,
                fontSize: '.9rem',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ─────────────────────────────────── */}
        {tab === 'orders' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>My Orders</h1>
              <button
                onClick={() => session && fetchOrders(session.access_token, true)}
                disabled={refreshing}
                style={{
                  fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.9rem',
                  border: '1px solid var(--color-border)', borderRadius: '2rem',
                  background: 'white', color: 'var(--color-text-muted)',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  opacity: refreshing ? 0.6 : 1, transition: 'opacity 180ms',
                }}>
                <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#dc2626' }}>{error}</div>
            )}

            {orders.length === 0 && !error ? (
              <div style={{ background: 'white', borderRadius: '.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</div>
                <h2 style={{ fontWeight: 700, marginBottom: '.5rem' }}>No orders yet</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>When you place an order, it will appear here.</p>
                <a href="/collections" className="btn btn-primary">Shop now</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => {
                  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
                  const addr = order.shipping_address ?? {};
                  const st = STATUS_STYLE[order.status] ?? { bg: '#f3f4f6', color: '#6b7280', label: order.status };
                  const isOpen = expanded === order.id;
                  return (
                    <div key={order.id} style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', gap: '.5rem', flexWrap: 'wrap', textAlign: 'left' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Order #{order.id.slice(0, 8).toUpperCase()}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '.15rem' }}>
                            {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{formatAUD(order.amount_aud)}</strong>
                          <span style={{ background: st.bg, color: st.color, borderRadius: '2rem', padding: '.2rem .75rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{st.label}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <div>
                            <SectionLabel>Items</SectionLabel>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                              {items.map((item, idx) => {
                                const productHref = item.slug ? `/products/${item.slug}` : null;
                                return (
                                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem .75rem', background: 'var(--color-surface-offset)', borderRadius: '.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '.4rem', background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                      {item.image
                                        ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ fontSize: '1.5rem' }}>🧵</span>}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      {productHref ? (
                                        <a href={productHref} style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.875rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}>
                                          {item.name}
                                        </a>
                                      ) : (
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                                      )}
                                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {item.size && <span>Size: {item.size} &middot; </span>}Qty: {item.quantity} &middot; {formatAUD(item.price)} each
                                      </div>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>{formatAUD(item.price * item.quantity)}</div>
                                  </li>
                                );
                              })}
                            </ul>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '.75rem', fontWeight: 700, fontSize: '0.9rem', borderTop: '1px solid var(--color-border)', marginTop: '.75rem' }}>
                              <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>Total paid</span>
                              <span style={{ color: 'var(--color-primary)' }}>{formatAUD(order.amount_aud)}</span>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
                            {(addr.line1 || addr.suburb) && (
                              <div>
                                <SectionLabel>Shipping address</SectionLabel>
                                <div style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                                  {order.customer_name && <div style={{ fontWeight: 600 }}>{order.customer_name}</div>}
                                  {addr.line1 && <div>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>}
                                  <div>{[addr.suburb, addr.state, addr.postcode].filter(Boolean).join(' ')}</div>
                                  <div style={{ color: 'var(--color-text-muted)' }}>Australia</div>
                                </div>
                              </div>
                            )}
                            {(order.customer_email || order.customer_phone) && (
                              <div>
                                <SectionLabel>Contact</SectionLabel>
                                <div style={{ fontSize: '0.875rem', lineHeight: 1.9 }}>
                                  {order.customer_email && <div>📧 {order.customer_email}</div>}
                                  {order.customer_phone && <div>📞 {order.customer_phone}</div>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── REWARDS TAB ────────────────────────────────── */}
        {tab === 'rewards' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '100%', maxWidth: 480 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 .25rem' }}>🌟 My Rewards</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem', margin: '0 0 1.25rem' }}>
                Earn points for every interaction. Redeem for discounts at checkout.
              </p>
              <RewardsWidget />
            </div>

            <div style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.75rem' }}>How to earn</h2>
              <table style={{ width: '100%', fontSize: '.875rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['🆕 Sign up',           '50 pts',       'One-time welcome bonus'],
                    ['🛒 Place an order',    '1 pt / AU$1',  'Automatically on payment'],
                    ['❤️ Like a product',   '10 pts',       'Per product, once each'],
                    ['⭐ Write a review',    '10–25 pts',    '25 pts if you bought the item'],
                    ['🎁 Redeem',            '200+ pts',     '80 pts = $1.00 AU discount'],
                  ].map(([action, pts, desc], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '.5rem 0', fontWeight: 600 }}>{action}</td>
                      <td style={{ padding: '.5rem', color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>{pts}</td>
                      <td style={{ padding: '.5rem 0', color: '#6b7280', fontSize: '.8rem' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', marginBottom: '.4rem' }}>{children}</div>;
}
