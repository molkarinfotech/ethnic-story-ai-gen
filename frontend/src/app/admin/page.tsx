'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatAUD } from '../../lib/products';

const LETTER_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

function sortVariants(variants: Variant[]) {
  const letter = variants.filter(v => LETTER_SIZE_ORDER.includes(v.size))
    .sort((a, b) => LETTER_SIZE_ORDER.indexOf(a.size) - LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = variants.filter(v => /^\d/.test(v.size))
    .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const other = variants.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

type Variant = { id: string; size: string; stock_count: number };

type Product = {
  id: string; slug: string; name: string; subtitle?: string;
  price: number; original_price?: number; category: string;
  badge?: string; image?: string; created_at: string;
  stock_count: number; low_stock_threshold: number;
  variants: Variant[];
};

type Order = {
  id: string; customer_name: string; customer_email: string;
  total: number; status: string; created_at: string;
  items: { name: string; quantity: number; price: number }[];
};

function StockBadge({ count, threshold }: { count: number; threshold: number }) {
  const c = Number(count);
  const out = c === 0;
  const low = c > 0 && c <= threshold;
  const bg = out ? '#fef2f2' : low ? '#fefce8' : '#dcfce7';
  const color = out ? '#dc2626' : low ? '#ca8a04' : '#16a34a';
  const label = out ? 'Out of stock' : low ? `Low (${c})` : `In stock (${c})`;
  return <span style={{ background: bg, color, borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'products' | 'orders' | 'inventory'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [stockSaving, setStockSaving] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [newSizes, setNewSizes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [seedingSizes, setSeedingSizes] = useState(false);
  const [seedSizesMsg, setSeedSizesMsg] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function fetchProducts() {
    const res = await fetch('/api/admin/stock');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    if (!res.ok) { setApiError(`Stock API error: ${data.error ?? res.statusText}`); return; }
    setProducts(Array.isArray(data) ? data : []);
  }

  async function fetchOrders() {
    const res = await fetch('/api/admin/orders');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    if (!res.ok) { setApiError(prev => prev + ` | Orders: ${data.error}`); return; }
    setOrders(Array.isArray(data) ? data : []);
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
    setSeeding(true); setSeedMsg('');
    const res = await fetch('/api/admin/seed', { method: 'POST' });
    const data = await res.json();
    setSeedMsg(data.error ? `❌ ${data.error}` : `✅ Seeded ${data.seeded} products!`);
    setSeeding(false);
    fetchProducts();
  }

  async function handleSeedSizes() {
    setSeedingSizes(true); setSeedSizesMsg('');
    const res = await fetch('/api/admin/seed-sizes', { method: 'POST' });
    const data = await res.json();
    setSeedSizesMsg(data.error ? `❌ ${data.error}` : `✅ ${data.message}`);
    setSeedingSizes(false);
    fetchProducts();
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  async function saveVariantStock(productId: string, variantId: string | null, size: string, count: number) {
    const key = variantId ?? `${productId}-${size}`;
    setStockSaving(s => ({ ...s, [key]: true }));
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variantId
        ? { variant_id: variantId, stock_count: count }
        : { product_id: productId, size, stock_count: count }
      ),
    });
    await fetchProducts();
    setStockEdits(e => { const n = { ...e }; delete n[key]; return n; });
    setStockSaving(s => ({ ...s, [key]: false }));
  }

  async function deleteVariant(variantId: string, size: string) {
    if (!confirm(`Remove size "${size}"? This cannot be undone.`)) return;
    setDeleting(d => ({ ...d, [variantId]: true }));
    await fetch('/api/admin/stock', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId }),
    });
    await fetchProducts();
    setDeleting(d => ({ ...d, [variantId]: false }));
  }

  async function addSize(productId: string) {
    const size = (newSizes[productId] ?? '').trim();
    if (!size) return;
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, size, stock_count: 0 }),
    });
    setNewSizes(n => ({ ...n, [productId]: '' }));
    await fetchProducts();
  }

  const allVariants = products.flatMap(p => p.variants ?? []);
  const outOfStockCount = allVariants.filter(v => Number(v.stock_count) === 0).length;
  const lowStockCount = allVariants.filter(v => Number(v.stock_count) > 0 && Number(v.stock_count) <= 5).length;

  if (loading) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard…</div>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', textDecoration: 'none' }}>Ethnic Story</a>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Admin Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/api/admin/debug" target="_blank" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>Debug env</a>
          <button onClick={handleLogout} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {apiError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
            <strong>API Error:</strong> {apiError}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Products', value: products.length, icon: '👗' },
            { label: 'Orders', value: orders.length, icon: '📦' },
            { label: 'Revenue', value: formatAUD(orders.reduce((s, o) => s + (o.total ?? 0), 0)), icon: '💰' },
            { label: 'Low Stock', value: lowStockCount, icon: '⚠️', alert: lowStockCount > 0 },
            { label: 'Out of Stock', value: outOfStockCount, icon: '🚫', alert: outOfStockCount > 0 },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: '.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: (s as any).alert && (s.value as number) > 0 ? '1px solid #fecaca' : '1px solid transparent' }}>
              <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '.25rem', color: (s as any).alert && (s.value as number) > 0 ? '#dc2626' : 'inherit' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
          {(['products', 'orders', 'inventory'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '.5rem 1.25rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: tab === t ? 'var(--color-primary)' : 'white', color: tab === t ? 'white' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'inventory' && outOfStockCount > 0 && (
                <span style={{ background: '#dc2626', color: 'white', borderRadius: '2rem', padding: '0 .45rem', fontSize: '0.7rem' }}>{outOfStockCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === 'products' && (
          <div style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Products ({products.length})</h2>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {seedMsg && <span style={{ fontSize: '0.8rem', color: seedMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{seedMsg}</span>}
                <button onClick={handleSeed} disabled={seeding} style={{ padding: '.4rem .9rem', borderRadius: '.5rem', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {seeding ? 'Seeding…' : '🌱 Seed products'}
                </button>
                <a href="/admin/products/new" style={{ padding: '.4rem .9rem', borderRadius: '.5rem', background: 'var(--color-primary)', color: 'white', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>+ Add product</a>
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
                        {p.image ? <img src={p.image} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '.375rem' }} /> : <span style={{ fontSize: '2rem' }}>🥻</span>}
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
                          <a href={`/admin/products/${p.id}/edit`} style={{ padding: '.3rem .7rem', borderRadius: '.375rem', background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)', fontSize: '0.75rem', textDecoration: 'none', color: 'var(--color-text)' }}>Edit</a>
                          <button onClick={() => handleDelete(p.id, p.name)} style={{ padding: '.3rem .7rem', borderRadius: '.375rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No products yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
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
                      <td style={{ padding: '.75rem 1rem' }}>{Array.isArray(o.items) ? o.items.map(it => `${it.name} ×${it.quantity}`).join(', ') : '—'}</td>
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

        {/* Inventory tab */}
        {tab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Inventory — Size &amp; Stock</h2>
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {seedSizesMsg && <span style={{ fontSize: '0.8rem', color: seedSizesMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{seedSizesMsg}</span>}
                <button onClick={handleSeedSizes} disabled={seedingSizes}
                  style={{ padding: '.4rem .9rem', borderRadius: '.5rem', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  {seedingSizes ? 'Seeding sizes…' : '👚 Seed default sizes (XS–XXL × 10)'}
                </button>
                <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '2rem', padding: '.2rem .8rem', fontSize: '0.8rem', fontWeight: 600 }}>{outOfStockCount} out of stock</span>
                <span style={{ background: '#fefce8', color: '#ca8a04', borderRadius: '2rem', padding: '.2rem .8rem', fontSize: '0.8rem', fontWeight: 600 }}>{lowStockCount} low stock</span>
              </div>
            </div>

            {products.map(p => (
              <div key={p.id} style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                <button
                  onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                  style={{ width: '100%', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {p.image && <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '.375rem' }} />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{p.category} &middot; {(p.variants ?? []).length} sizes</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    {(p.variants ?? []).some(v => Number(v.stock_count) === 0) && (
                      <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '2rem', padding: '.15rem .6rem', fontSize: '0.7rem', fontWeight: 600 }}>Has OOS sizes</span>
                    )}
                    <span style={{ color: 'var(--color-text-muted)' }}>{expanded[p.id] ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded[p.id] && (
                  <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface-offset)' }}>
                          {['Size', 'Status', 'Stock count', 'Save', 'Delete'].map(h => (
                            <th key={h} style={{ padding: '.5rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(p.variants ?? []).length === 0 && (
                          <tr><td colSpan={5} style={{ padding: '.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No sizes yet — click "👚 Seed default sizes" above or add one below.</td></tr>
                        )}
                        {sortVariants(p.variants ?? []).map(v => {
                          const key = v.id;
                          const editVal = stockEdits[key] ?? Number(v.stock_count);
                          return (
                            <tr key={v.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '.6rem .75rem', fontWeight: 700 }}>{v.size}</td>
                              <td style={{ padding: '.6rem .75rem' }}><StockBadge count={editVal} threshold={5} /></td>
                              <td style={{ padding: '.6rem .75rem' }}>
                                <input type="number" min={0} value={editVal}
                                  onChange={e => setStockEdits(ed => ({ ...ed, [key]: parseInt(e.target.value) || 0 }))}
                                  style={{ width: '80px', padding: '.3rem .5rem', border: '1px solid var(--color-border)', borderRadius: '.375rem', fontSize: '0.875rem' }} />
                              </td>
                              <td style={{ padding: '.6rem .75rem' }}>
                                <button
                                  onClick={() => saveVariantStock(p.id, v.id, v.size, editVal)}
                                  disabled={stockSaving[key] || !(key in stockEdits)}
                                  style={{ padding: '.3rem .8rem', borderRadius: '.375rem', background: key in stockEdits ? 'var(--color-primary)' : 'var(--color-surface-offset)', color: key in stockEdits ? 'white' : 'var(--color-text-muted)', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: key in stockEdits ? 'pointer' : 'default' }}>
                                  {stockSaving[key] ? 'Saving…' : 'Save'}
                                </button>
                              </td>
                              <td style={{ padding: '.6rem .75rem' }}>
                                <button
                                  onClick={() => deleteVariant(v.id, v.size)}
                                  disabled={deleting[v.id]}
                                  style={{ padding: '.3rem .7rem', borderRadius: '.375rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>
                                  {deleting[v.id] ? '…' : '🗑️'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Add size:</span>
                      {['XS','S','M','L','XL','XXL','Free Size'].filter(s => !(p.variants ?? []).find(v => v.size === s)).map(s => (
                        <button key={s} onClick={() => saveVariantStock(p.id, null, s, 0)}
                          style={{ padding: '.25rem .6rem', borderRadius: '.375rem', border: '1px dashed var(--color-border)', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>+ {s}</button>
                      ))}
                      <input value={newSizes[p.id] ?? ''}
                        onChange={e => setNewSizes(n => ({ ...n, [p.id]: e.target.value }))}
                        placeholder="Custom e.g. 32, 38…"
                        style={{ padding: '.3rem .6rem', border: '1px solid var(--color-border)', borderRadius: '.375rem', fontSize: '0.8rem', width: '140px' }}
                        onKeyDown={e => e.key === 'Enter' && addSize(p.id)} />
                      <button onClick={() => addSize(p.id)}
                        style={{ padding: '.3rem .7rem', borderRadius: '.375rem', background: 'var(--color-primary)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                    </div>
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
