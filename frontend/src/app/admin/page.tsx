'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatAUD } from '../../lib/products';

type Product = {
  id: string; slug: string; name: string; subtitle?: string;
  price: number; original_price?: number; category: string;
  badge?: string; image?: string; created_at: string;
};

type Order = {
  id: string; customer_name: string; customer_email: string;
  total: number; status: string; created_at: string;
  items: { name: string; quantity: number; price: number }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  async function fetchProducts() {
    const res = await fetch('/api/admin/products');
    if (res.status === 401) { router.push('/admin/login'); return; }
    setProducts(await res.json());
  }

  async function fetchOrders() {
    const res = await fetch('/api/admin/orders');
    if (res.status === 401) { router.push('/admin/login'); return; }
    setOrders(await res.json());
  }

  useEffect(() => {
    Promise.all([fetchProducts(), fetchOrders()]).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    setProducts(p => p.filter(x => x.id !== id));
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedMsg('');
    const res = await fetch('/api/admin/seed', { method: 'POST' });
    const data = await res.json();
    setSeedMsg(data.error ? `Error: ${data.error}` : `✅ Seeded ${data.seeded} products!`);
    setSeeding(false);
    fetchProducts();
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard…</div>;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', textDecoration: 'none' }}>Ethnic Story</a>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Admin Dashboard</span>
        </div>
        <button onClick={handleLogout} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Products', value: products.length, icon: '👗' },
            { label: 'Total Orders', value: orders.length, icon: '📦' },
            { label: 'Revenue', value: formatAUD(orders.reduce((s, o) => s + o.total, 0)), icon: '💰' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: '.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '.25rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
          {(['products', 'orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '.5rem 1.25rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                background: tab === t ? 'var(--color-primary)' : 'white',
                color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === 'products' && (
          <div style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Products ({products.length})</h2>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {seedMsg && <span style={{ fontSize: '0.8rem', color: seedMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{seedMsg}</span>}
                <button onClick={handleSeed} disabled={seeding}
                  style={{ padding: '.4rem .9rem', borderRadius: '.5rem', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {seeding ? 'Seeding…' : '🌱 Seed default products'}
                </button>
                <a href="/admin/products/new"
                  style={{ padding: '.4rem .9rem', borderRadius: '.5rem', background: 'var(--color-primary)', color: 'white', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                  + Add product
                </a>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-offset)' }}>
                    {['Image', 'Name', 'Category', 'Price', 'Badge', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--color-border)', background: i % 2 === 0 ? 'white' : 'var(--color-surface-offset)' }}>
                      <td style={{ padding: '.75rem 1rem' }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '.375rem' }} />
                          : <span style={{ fontSize: '2rem' }}>🥻</span>}
                      </td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.subtitle && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{p.subtitle}</div>}
                      </td>
                      <td style={{ padding: '.75rem 1rem', textTransform: 'capitalize' }}>{p.category}</td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{formatAUD(p.price)}</div>
                        {p.original_price && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textDecoration: 'line-through' }}>{formatAUD(p.original_price)}</div>}
                      </td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        {p.badge && <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '2rem', padding: '.15rem .6rem', fontSize: '0.7rem', fontWeight: 600 }}>{p.badge}</span>}
                      </td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <a href={`/admin/products/${p.id}/edit`}
                            style={{ padding: '.3rem .7rem', borderRadius: '.375rem', background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)', fontSize: '0.75rem', textDecoration: 'none', color: 'var(--color-text)' }}>Edit</a>
                          <button onClick={() => handleDelete(p.id, p.name)}
                            style={{ padding: '.3rem .7rem', borderRadius: '.375rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No products yet. Click "Seed default products" to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Orders ({orders.length})</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-offset)' }}>
                    {['Date', 'Customer', 'Items', 'Total', 'Status'].map(h => (
                      <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ borderTop: '1px solid var(--color-border)', background: i % 2 === 0 ? 'white' : 'var(--color-surface-offset)' }}>
                      <td style={{ padding: '.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('en-AU')}</td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{o.customer_email}</div>
                      </td>
                      <td style={{ padding: '.75rem 1rem' }}>{Array.isArray(o.items) ? o.items.map((it: { name: string; quantity: number }) => `${it.name} ×${it.quantity}`).join(', ') : '—'}</td>
                      <td style={{ padding: '.75rem 1rem', fontWeight: 600 }}>{formatAUD(o.total)}</td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
