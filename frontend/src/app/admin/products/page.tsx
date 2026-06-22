'use client';
import { useState, useEffect } from 'react';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  gender?: string;
  badge?: string;
  in_stock?: boolean;
  image?: string;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/products')
      .then(r => r.json())
      .then(data => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleStock(id: string, current: boolean) {
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_stock: !current }),
    });
    setProducts(ps => ps.map(p => p.id === id ? { ...p, in_stock: !current } : p));
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    setProducts(ps => ps.filter(p => p.id !== id));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Products</h1>
        <a
          href="/admin/products/new"
          style={{ background: '#9d174d', color: 'white', borderRadius: '.5rem', padding: '.5rem 1.1rem', textDecoration: 'none', fontSize: '.875rem', fontWeight: 600 }}
        >
          + Add product
        </a>
      </div>

      <input
        type="search"
        placeholder="Search by name or category…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '.6rem .9rem', borderRadius: '.5rem', border: '1px solid #e5e7eb', fontSize: '.875rem', marginBottom: '1rem', outline: 'none' }}
      />

      {loading && <p style={{ color: '#6b7280', fontSize: '.875rem' }}>Loading products…</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>📦</div>
          <p style={{ fontWeight: 600, color: '#6b7280' }}>No products found</p>
          <p style={{ fontSize: '.875rem', marginTop: '.25rem' }}>{search ? 'Try a different search term' : 'Add your first product to get started'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {filtered.map(p => (
          <div key={p.id} style={{
            background: 'white', borderRadius: '.65rem', padding: '.9rem 1rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            border: '1px solid #fce7f3', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            flexWrap: 'wrap',
          }}>
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.name} width={48} height={48}
                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
                {p.badge && <span style={{ marginLeft: '.4rem', fontSize: '.65rem', background: '#fce7f3', color: '#9d174d', borderRadius: '2rem', padding: '.1rem .45rem', fontWeight: 700 }}>{p.badge}</span>}
              </div>
              <div style={{ fontSize: '.775rem', color: '#6b7280', marginTop: '.15rem' }}>
                {p.category}{p.gender ? ` · ${p.gender}` : ''} · <strong style={{ color: '#111827' }}>A${p.price}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
              <button
                onClick={() => toggleStock(p.id, p.in_stock ?? true)}
                style={{
                  fontSize: '.72rem', fontWeight: 600, borderRadius: '2rem',
                  padding: '.2rem .65rem', border: 'none', cursor: 'pointer',
                  background: p.in_stock !== false ? '#dcfce7' : '#fee2e2',
                  color: p.in_stock !== false ? '#166534' : '#991b1b',
                }}
              >
                {p.in_stock !== false ? 'In stock' : 'Out of stock'}
              </button>
              <a
                href={`/admin/products/${p.id}/edit`}
                style={{ fontSize: '.775rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none', padding: '.25rem .55rem', borderRadius: '.35rem', background: '#fdf2f8' }}
              >
                Edit
              </a>
              <button
                onClick={() => deleteProduct(p.id, p.name)}
                style={{ fontSize: '.775rem', color: '#6b7280', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '.25rem' }}
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
