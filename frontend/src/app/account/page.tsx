'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { formatAUD } from '../../lib/products';

type OrderItem = { id: string; name: string; quantity: number; price: number; size?: string };
type Order = {
  id: string; created_at: string; amount_aud: number; total: number;
  status: string; items: OrderItem[];
  customer_name?: string; shipping_address?: { line1?: string; suburb?: string; state?: string; postcode?: string };
};

export default function AccountPage() {
  const router = useRouter();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) { router.push('/login'); return; }

    fetch('/api/account/orders', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
        else setError(data.error ?? 'Failed to load orders');
      })
      .catch(() => setError('Network error — please try again.'))
      .finally(() => setOrdersLoading(false));
  }, [authLoading, user, session, router]);

  if (authLoading || ordersLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
      Loading your account…
    </main>
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

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>My Orders</h1>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#dc2626' }}>
            {error}
          </div>
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
            {orders.map(order => (
              <div key={order.id} style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '.1rem' }}>Order #{order.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 700 }}>{formatAUD(order.amount_aud ?? order.total)}</span>
                    <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '2rem', padding: '.2rem .75rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{order.status}</span>
                  </div>
                </div>
                <ul style={{ margin: 0, padding: '1rem 1.25rem', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {(Array.isArray(order.items) ? order.items : []).map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span>{item.name}{item.size ? ` — ${item.size}` : ''} × {item.quantity}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{formatAUD(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                {order.shipping_address && (
                  <div style={{ padding: '.75rem 1.25rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    🚚 Ships to: {[order.shipping_address.line1, order.shipping_address.suburb, order.shipping_address.state, order.shipping_address.postcode].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
