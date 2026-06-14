'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { formatAUD } from '../../lib/products';

type OrderItem = { id: string; name: string; quantity: number; price: number; size?: string };
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

export default function AccountPage() {
  const router = useRouter();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) { router.push('/login'); return; }
    fetch('/api/account/orders', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOrders(data); else setError(data.error ?? 'Failed to load orders'); })
      .catch(() => setError('Network error — please try again.'))
      .finally(() => setOrdersLoading(false));
  }, [authLoading, user, session, router]);

  if (authLoading || ordersLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading your account…</main>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', textDecoration: 'none' }}>Ethnic Story</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{user?.email}</span>
          <button onClick={signOut} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>My Orders</h1>

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
                          {items.map((item, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem .75rem', background: 'var(--color-surface-offset)', borderRadius: '.5rem' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '.4rem', background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>🧵</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <a href={`/products/${item.id}`} style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.875rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.name}
                                </a>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                  {item.size && <span>Size: {item.size} &middot; </span>}Qty: {item.quantity} &middot; {formatAUD(item.price)} each
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>{formatAUD(item.price * item.quantity)}</div>
                            </li>
                          ))}
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
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', marginBottom: '.4rem' }}>{children}</div>;
}
