'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatAUD } from '../../lib/products';
import { Spinner } from '../../components/ui/Spinner';

type Order = {
  id: string; created_at: string; total: number; status: string;
  items: { name: string; quantity: number; price: number }[];
};

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Redirect to login only after auth has fully loaded and confirmed no user
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/account/orders')
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [user]);

  // Show spinner while auth is loading
  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );

  // Will redirect via useEffect — show nothing in the meantime
  if (!user) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <main style={{ background: 'var(--color-bg)', minHeight: '80vh', padding: 'var(--space-16) 0' }}>
      <div className="container" style={{ maxWidth: '780px' }}>

        {/* Profile header */}
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #8b2f54 100%)', borderRadius: 'var(--radius-xl)', padding: '2rem 2.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{user.name ?? 'My Account'}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.75)', marginTop: '.2rem' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={signOut}
            style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: 'white', padding: '.5rem 1.25rem', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>

        {/* Order history */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--color-divider)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>Order history</h2>
          </div>

          {ordersLoading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
              <Spinner size={32} />
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
              <p style={{ color: 'var(--color-text-muted)' }}>No orders yet.</p>
              <a href="/collections" style={{ display: 'inline-block', marginTop: '1rem', background: 'var(--color-primary)', color: 'white', padding: '.6rem 1.5rem', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Start shopping</a>
            </div>
          ) : (
            <div>
              {orders.map((order, i) => (
                <div key={order.id} style={{ padding: '1.25rem 1.75rem', borderTop: i > 0 ? '1px solid var(--color-divider)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Order #{order.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '.2rem' }}>
                        {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div style={{ marginTop: '.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {Array.isArray(order.items) ? order.items.map(it => `${it.name} ×${it.quantity}`).join(' · ') : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatAUD(order.total)}</div>
                      <span style={{ display: 'inline-block', marginTop: '.35rem', background: '#dcfce7', color: '#16a34a', borderRadius: 'var(--radius-full)', padding: '.2rem .7rem', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'capitalize' }}>{order.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
