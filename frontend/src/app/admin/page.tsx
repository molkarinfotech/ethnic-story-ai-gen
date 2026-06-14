'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatAUD } from '../../lib/products';

const LETTER_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

function sortVariants(variants: Variant[]) {
  const letter  = variants.filter(v => LETTER_SIZE_ORDER.includes(v.size)).sort((a, b) => LETTER_SIZE_ORDER.indexOf(a.size) - LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = variants.filter(v => /^\d/.test(v.size)).sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const other   = variants.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

type Variant  = { id: string; size: string; colour: string; stock_count: number };
type ImgRow   = { id: string; colour: string; url: string; sort_order: number };
type Product  = { id: string; slug: string; name: string; subtitle?: string; price: number; original_price?: number; category: string; badge?: string; image?: string; created_at: string; stock_count: number; low_stock_threshold: number; variants: Variant[] };
type Order    = { id: string; customer_name: string; customer_email: string; amount_aud: number; status: string; created_at: string; items: { name: string; quantity: number; price: number; size?: string; colour?: string }[]; shipping_address?: { line1?: string; suburb?: string; state?: string; postcode?: string } };

function StockBadge({ count, threshold }: { count: number; threshold: number }) {
  const c = Number(count);
  const out = c === 0; const low = c > 0 && c <= threshold;
  return <span style={{ background: out ? '#fef2f2' : low ? '#fefce8' : '#dcfce7', color: out ? '#dc2626' : low ? '#ca8a04' : '#16a34a', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{out ? 'Out of stock' : low ? `Low (${c})` : `In stock (${c})`}</span>;
}

// ─── Images tab sub-component ────────────────────────────────────────────────
function ImagesTab({ products }: { products: Product[] }) {
  const [expanded,    setExpanded]    = useState<Record<string, boolean>>({});
  const [imgData,     setImgData]     = useState<Record<string, ImgRow[]>>({}); // productId → rows
  const [loadingImgs, setLoadingImgs] = useState<Record<string, boolean>>({});
  const [newUrl,      setNewUrl]      = useState<Record<string, string>>({});      // productId → url
  const [newColour,   setNewColour]   = useState<Record<string, string>>({});      // productId → colour
  const [saving,      setSaving]      = useState<Record<string, boolean>>({});
  const [deleting,    setDeleting]    = useState<Record<string, boolean>>({});
  const [seedingColours, setSeedingColours] = useState(false);
  const [seedMsg,     setSeedMsg]     = useState('');

  const fetchImgs = useCallback(async (productId: string) => {
    setLoadingImgs(l => ({ ...l, [productId]: true }));
    const res  = await fetch(`/api/product-images/${productId}`);
    const data = await res.json();
    setImgData(d => ({ ...d, [productId]: Array.isArray(data) ? data : [] }));
    setLoadingImgs(l => ({ ...l, [productId]: false }));
  }, []);

  function toggle(productId: string) {
    const next = !expanded[productId];
    setExpanded(e => ({ ...e, [productId]: next }));
    if (next && !imgData[productId]) fetchImgs(productId);
  }

  async function addImage(productId: string) {
    const url    = (newUrl[productId]    ?? '').trim();
    const colour = (newColour[productId] ?? '').trim();
    if (!url) return;
    setSaving(s => ({ ...s, [productId]: true }));
    const existing = imgData[productId] ?? [];
    const maxOrder = existing.filter(r => r.colour === colour).reduce((m, r) => Math.max(m, r.sort_order), -1);
    await fetch(`/api/product-images/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, colour, sort_order: maxOrder + 1 }),
    });
    setNewUrl(n    => ({ ...n,    [productId]: '' }));
    setNewColour(n => ({ ...n, [productId]: '' }));
    await fetchImgs(productId);
    setSaving(s => ({ ...s, [productId]: false }));
  }

  async function deleteImage(productId: string, imgId: string) {
    if (!confirm('Remove this image?')) return;
    setDeleting(d => ({ ...d, [imgId]: true }));
    await fetch(`/api/product-images/${productId}?id=${imgId}`, { method: 'DELETE' });
    await fetchImgs(productId);
    setDeleting(d => ({ ...d, [imgId]: false }));
  }

  async function moveImage(productId: string, imgId: string, direction: -1 | 1) {
    const rows   = [...(imgData[productId] ?? [])];
    const idx    = rows.findIndex(r => r.id === imgId);
    const colour = rows[idx].colour;
    const group  = rows.filter(r => r.colour === colour).sort((a, b) => a.sort_order - b.sort_order);
    const gIdx   = group.findIndex(r => r.id === imgId);
    const swapIdx = gIdx + direction;
    if (swapIdx < 0 || swapIdx >= group.length) return;

    // Swap sort_order values via two PATCHes
    const a = group[gIdx]; const b = group[swapIdx];
    await Promise.all([
      fetch(`/api/product-images/${productId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, sort_order: b.sort_order }) }),
      fetch(`/api/product-images/${productId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, sort_order: a.sort_order }) }),
    ]);
    await fetchImgs(productId);
  }

  async function handleSeedColours() {
    setSeedingColours(true); setSeedMsg('');
    const res  = await fetch('/api/admin/seed-colours', { method: 'POST' });
    const data = await res.json();
    setSeedMsg(data.error ? `❌ ${data.error}` : `✅ ${data.message}`);
    setSeedingColours(false);
    // Refresh any open product
    for (const pid of Object.keys(expanded)) { if (expanded[pid]) fetchImgs(pid); }
  }

  // Group images by colour for display
  function groupByColour(rows: ImgRow[]): { colour: string; imgs: ImgRow[] }[] {
    const map = new Map<string, ImgRow[]>();
    for (const r of [...rows].sort((a, b) => a.sort_order - b.sort_order)) {
      const key = r.colour || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([colour, imgs]) => ({ colour, imgs }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Product Images — by Colour</h2>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          {seedMsg && <span style={{ fontSize: '0.8rem', color: seedMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{seedMsg}</span>}
          <button onClick={handleSeedColours} disabled={seedingColours}
            style={{ padding: '.4rem .9rem', borderRadius: '.5rem', border: '1px solid #a855f7', background: '#faf5ff', color: '#7c3aed', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            {seedingColours ? 'Seeding…' : '🎨 Seed sample images'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
        Each colour can have multiple images. The first image is shown as the main photo when that colour is selected.
      </p>

      {products.map(p => {
        const rows   = imgData[p.id] ?? [];
        const groups = groupByColour(rows);
        const total  = rows.length;

        return (
          <div key={p.id} style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
            {/* Accordion header */}
            <button onClick={() => toggle(p.id)}
              style={{ width: '100%', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {p.image && <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '.375rem' }} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                    {p.category}
                    {expanded[p.id] && !loadingImgs[p.id] && (
                      <> &middot; {total} image{total !== 1 ? 's' : ''} across {groups.length} colour{groups.length !== 1 ? 's' : ''}</>
                    )}
                  </div>
                </div>
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{expanded[p.id] ? '▲' : '▼'}</span>
            </button>

            {expanded[p.id] && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem 1.5rem' }}>
                {loadingImgs[p.id] ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</div>
                ) : (
                  <>
                    {/* Colour groups */}
                    {groups.length === 0 && (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>No images yet. Add one below.</p>
                    )}

                    {groups.map(({ colour, imgs }) => (
                      <div key={colour} style={{ marginBottom: '1.25rem' }}>
                        {/* Colour label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.6rem' }}>
                          <span style={{ background: colour ? 'var(--color-primary-highlight)' : 'var(--color-surface-offset)', color: colour ? 'var(--color-primary)' : 'var(--color-text-muted)', borderRadius: '2rem', padding: '.2rem .75rem', fontSize: '0.75rem', fontWeight: 700 }}>
                            {colour || 'No colour (ungrouped)'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{imgs.length} image{imgs.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Image tiles */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>
                          {imgs.map((img, gIdx) => (
                            <div key={img.id} style={{ position: 'relative', width: '120px' }}>
                              {/* Thumbnail */}
                              <div style={{ width: '120px', height: '120px', borderRadius: '.5rem', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-surface-offset)' }}>
                                <img
                                  src={img.url}
                                  alt={`${colour} ${gIdx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120?text=?'; }}
                                />
                              </div>
                              {/* Sort order badge */}
                              <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,.55)', color: 'white', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px' }}>
                                #{gIdx + 1}
                              </div>
                              {/* URL tooltip */}
                              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '.3rem', wordBreak: 'break-all', lineHeight: 1.3, maxHeight: '2.6em', overflow: 'hidden' }} title={img.url}>
                                {img.url.replace(/^https?:\/\//, '').slice(0, 48)}{img.url.length > 55 ? '…' : ''}
                              </div>
                              {/* Action buttons */}
                              <div style={{ display: 'flex', gap: '.25rem', marginTop: '.35rem' }}>
                                <button
                                  onClick={() => moveImage(p.id, img.id, -1)}
                                  disabled={gIdx === 0}
                                  title="Move left"
                                  style={{ flex: 1, padding: '.2rem', borderRadius: '.3rem', border: '1px solid var(--color-border)', background: 'white', cursor: gIdx === 0 ? 'not-allowed' : 'pointer', opacity: gIdx === 0 ? 0.3 : 1, fontSize: '0.7rem' }}>◀</button>
                                <button
                                  onClick={() => moveImage(p.id, img.id, 1)}
                                  disabled={gIdx === imgs.length - 1}
                                  title="Move right"
                                  style={{ flex: 1, padding: '.2rem', borderRadius: '.3rem', border: '1px solid var(--color-border)', background: 'white', cursor: gIdx === imgs.length - 1 ? 'not-allowed' : 'pointer', opacity: gIdx === imgs.length - 1 ? 0.3 : 1, fontSize: '0.7rem' }}>▶</button>
                                <button
                                  onClick={() => deleteImage(p.id, img.id)}
                                  disabled={deleting[img.id]}
                                  title="Delete"
                                  style={{ flex: 1, padding: '.2rem', borderRadius: '.3rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', fontSize: '0.7rem' }}>
                                  {deleting[img.id] ? '…' : '🗑️'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Divider */}
                    <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '1rem', marginTop: '.5rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '.6rem' }}>Add image</div>
                      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* URL input with live preview */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                          <input
                            value={newUrl[p.id] ?? ''}
                            onChange={e => setNewUrl(n => ({ ...n, [p.id]: e.target.value }))}
                            placeholder="Image URL…"
                            style={{ padding: '.35rem .6rem', border: '1px solid var(--color-border)', borderRadius: '.375rem', fontSize: '0.8rem', width: '280px' }}
                            onKeyDown={e => e.key === 'Enter' && addImage(p.id)}
                          />
                          {/* Live preview */}
                          {(newUrl[p.id] ?? '').length > 10 && (
                            <img
                              src={newUrl[p.id]}
                              alt="preview"
                              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '.375rem', border: '1px solid var(--color-border)' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              onLoad={e  => { (e.target as HTMLImageElement).style.display = 'block'; }}
                            />
                          )}
                        </div>

                        {/* Colour input — autofills from existing colour groups */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                          <input
                            value={newColour[p.id] ?? ''}
                            onChange={e => setNewColour(n => ({ ...n, [p.id]: e.target.value }))}
                            placeholder="Colour (e.g. Red)"
                            style={{ padding: '.35rem .6rem', border: '1px solid var(--color-border)', borderRadius: '.375rem', fontSize: '0.8rem', width: '160px' }}
                            list={`colours-${p.id}`}
                            onKeyDown={e => e.key === 'Enter' && addImage(p.id)}
                          />
                          {/* Datalist for quick colour picks */}
                          <datalist id={`colours-${p.id}`}>
                            {groups.map(g => <option key={g.colour} value={g.colour} />)}
                          </datalist>
                          {/* Existing colour quick-pick pills */}
                          {groups.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                              {groups.map(g => (
                                <button key={g.colour}
                                  onClick={() => setNewColour(n => ({ ...n, [p.id]: g.colour }))}
                                  style={{ padding: '.15rem .5rem', borderRadius: '2rem', border: `1px solid ${newColour[p.id] === g.colour ? 'var(--color-primary)' : 'var(--color-border)'}`, background: newColour[p.id] === g.colour ? 'var(--color-primary-highlight)' : 'white', color: newColour[p.id] === g.colour ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: '0.7rem', cursor: 'pointer' }}>
                                  {g.colour || 'ungrouped'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button onClick={() => addImage(p.id)} disabled={saving[p.id] || !(newUrl[p.id] ?? '').trim()}
                          style={{ padding: '.35rem .9rem', borderRadius: '.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', opacity: (newUrl[p.id] ?? '').trim() ? 1 : 0.4, alignSelf: 'flex-start' }}>
                          {saving[p.id] ? 'Adding…' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab]       = useState<'products' | 'orders' | 'inventory' | 'images'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [stockEdits,  setStockEdits]  = useState<Record<string, number>>({});
  const [stockSaving, setStockSaving] = useState<Record<string, boolean>>({});
  const [deleting,    setDeleting]    = useState<Record<string, boolean>>({});
  const [newSizes,    setNewSizes]    = useState<Record<string, string>>({});
  const [newColours,  setNewColours]  = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(true);
  const [apiError,  setApiError]  = useState('');
  const [seeding,   setSeeding]   = useState(false);
  const [seedMsg,   setSeedMsg]   = useState('');
  const [seedingSizes,   setSeedingSizes]   = useState(false);
  const [seedSizesMsg,   setSeedSizesMsg]   = useState('');
  const [seedingColours, setSeedingColours] = useState(false);
  const [seedColoursMsg, setSeedColoursMsg] = useState('');
  const [expanded,      setExpanded]      = useState<Record<string, boolean>>({});
  const [expandedOrder, setExpandedOrder] = useState<Record<string, boolean>>({});

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

  useEffect(() => { Promise.all([fetchProducts(), fetchOrders()]).finally(() => setLoading(false)); }, []);

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
    setSeeding(false); fetchProducts();
  }

  async function handleSeedSizes() {
    setSeedingSizes(true); setSeedSizesMsg('');
    const res = await fetch('/api/admin/seed-sizes', { method: 'POST' });
    const data = await res.json();
    setSeedSizesMsg(data.error ? `❌ ${data.error}` : `✅ ${data.message}`);
    setSeedingSizes(false); fetchProducts();
  }

  async function handleSeedColours() {
    setSeedingColours(true); setSeedColoursMsg('');
    const res = await fetch('/api/admin/seed-colours', { method: 'POST' });
    const data = await res.json();
    setSeedColoursMsg(data.error ? `❌ ${data.error}` : `✅ ${data.message}`);
    setSeedingColours(false); fetchProducts();
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  async function saveVariantStock(productId: string, variantId: string | null, size: string, count: number, colour = '') {
    const key = variantId ?? `${productId}-${size}-${colour}`;
    setStockSaving(s => ({ ...s, [key]: true }));
    await fetch('/api/admin/stock', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variantId ? { variant_id: variantId, stock_count: count } : { product_id: productId, size, colour, stock_count: count }),
    });
    await fetchProducts();
    setStockEdits(e => { const n = { ...e }; delete n[key]; return n; });
    setStockSaving(s => ({ ...s, [key]: false }));
  }

  async function deleteVariant(variantId: string, size: string, colour: string) {
    if (!confirm(`Remove "${size}${colour ? ` / ${colour}` : ''}"? This cannot be undone.`)) return;
    setDeleting(d => ({ ...d, [variantId]: true }));
    await fetch('/api/admin/stock', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variant_id: variantId }) });
    await fetchProducts();
    setDeleting(d => ({ ...d, [variantId]: false }));
  }

  async function addVariant(productId: string) {
    const size = (newSizes[productId] ?? '').trim();
    const colour = (newColours[productId] ?? '').trim();
    if (!size) return;
    await fetch('/api/admin/stock', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, size, colour, stock_count: 0 }) });
    setNewSizes(n => ({ ...n, [productId]: '' }));
    setNewColours(n => ({ ...n, [productId]: '' }));
    await fetchProducts();
  }

  const allVariants     = products.flatMap(p => p.variants ?? []);
  const outOfStockCount = allVariants.filter(v => Number(v.stock_count) === 0).length;
  const lowStockCount   = allVariants.filter(v => Number(v.stock_count) > 0 && Number(v.stock_count) <= 5).length;

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard…</div>;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)' }}>
      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', textDecoration: 'none' }}>Ethnic Story</a>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Admin Dashboard</span>
        </div>
        <button onClick={handleLogout} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
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
            { label: 'Orders',   value: orders.length,   icon: '📦' },
            { label: 'Revenue',  value: formatAUD(orders.reduce((s, o) => s + (Number(o.amount_aud) || 0), 0)), icon: '💰' },
            { label: 'Low Stock',     value: lowStockCount,   icon: '⚠️',  alert: lowStockCount > 0 },
            { label: 'Out of Stock',  value: outOfStockCount, icon: '🚫', alert: outOfStockCount > 0 },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: '.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: (s as any).alert && (s.value as number) > 0 ? '1px solid #fecaca' : '1px solid transparent' }}>
              <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '.25rem', color: (s as any).alert && (s.value as number) > 0 ? '#dc2626' : 'inherit' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['products', 'orders', 'inventory', 'images'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '.5rem 1.25rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: tab === t ? 'var(--color-primary)' : 'white', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
              {t === 'images' ? '🖼️ Images' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'inventory' && outOfStockCount > 0 && (
                <span style={{ background: '#dc2626', color: 'white', borderRadius: '2rem', padding: '0 .45rem', fontSize: '0.7rem', marginLeft: '.4rem' }}>{outOfStockCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Products tab ── */}
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
                  {products.length === 0 && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No products yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Orders tab ── */}
        {tab === 'orders' && (
          <div style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Orders ({orders.length})</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-offset)' }}>
                    {['Date', 'Customer', 'Items', 'Shipping', 'Total', 'Status'].map(h => (
                      <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id}
                      onClick={() => setExpandedOrder(e => ({ ...e, [o.id]: !e[o.id] }))}
                      style={{ borderTop: '1px solid var(--color-border)', background: i % 2 === 0 ? 'white' : 'var(--color-surface-offset)', cursor: 'pointer' }}>
                      <td style={{ padding: '.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('en-AU')}</td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{o.customer_name || '—'}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{o.customer_email || '—'}</div>
                      </td>
                      <td style={{ padding: '.75rem 1rem', maxWidth: '220px' }}>
                        {Array.isArray(o.items) ? o.items.map(it => `${it.name}${it.size ? ` (${it.size}${it.colour ? ` / ${it.colour}` : ''})` : ''} ×${it.quantity}`).join(', ') : '—'}
                        {expandedOrder[o.id] && o.items && (
                          <ul style={{ margin: '.5rem 0 0', padding: '0 0 0 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {o.items.map((it, idx) => (
                              <li key={idx}>{it.name}{it.size ? ` — ${it.size}${it.colour ? ` / ${it.colour}` : ''}` : ''} × {it.quantity} @ {formatAUD(it.price)}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td style={{ padding: '.75rem 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {o.shipping_address ? [o.shipping_address.line1, o.shipping_address.suburb, o.shipping_address.state, o.shipping_address.postcode].filter(Boolean).join(', ') : '—'}
                      </td>
                      <td style={{ padding: '.75rem 1rem', fontWeight: 600 }}>{formatAUD(Number(o.amount_aud))}</td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Inventory tab ── */}
        {tab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Inventory — Size, Colour & Stock</h2>
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {seedSizesMsg   && <span style={{ fontSize: '0.8rem', color: seedSizesMsg.startsWith('✅')   ? '#16a34a' : '#dc2626' }}>{seedSizesMsg}</span>}
                {seedColoursMsg && <span style={{ fontSize: '0.8rem', color: seedColoursMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{seedColoursMsg}</span>}
                <button onClick={handleSeedSizes} disabled={seedingSizes} style={{ padding: '.4rem .9rem', borderRadius: '.5rem', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  {seedingSizes ? 'Seeding sizes…' : '👚 Seed default sizes'}
                </button>
                <button onClick={handleSeedColours} disabled={seedingColours} style={{ padding: '.4rem .9rem', borderRadius: '.5rem', border: '1px solid #a855f7', background: '#faf5ff', color: '#7c3aed', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  {seedingColours ? 'Seeding…' : '🎨 Seed colour variants & images'}
                </button>
                <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '2rem', padding: '.2rem .8rem', fontSize: '0.8rem', fontWeight: 600 }}>{outOfStockCount} out of stock</span>
                <span style={{ background: '#fefce8', color: '#ca8a04', borderRadius: '2rem', padding: '.2rem .8rem', fontSize: '0.8rem', fontWeight: 600 }}>{lowStockCount} low stock</span>
              </div>
            </div>

            {products.map(p => (
              <div key={p.id} style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                <button onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                  style={{ width: '100%', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {p.image && <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '.375rem' }} />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{p.category} · {(p.variants ?? []).length} variants</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    {(p.variants ?? []).some(v => Number(v.stock_count) === 0) && (
                      <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '2rem', padding: '.15rem .6rem', fontSize: '0.7rem', fontWeight: 600 }}>Has OOS variants</span>
                    )}
                    <span style={{ color: 'var(--color-text-muted)' }}>{expanded[p.id] ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded[p.id] && (
                  <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface-offset)' }}>
                          {['Colour', 'Size', 'Status', 'Stock count', 'Save', 'Delete'].map(h => (
                            <th key={h} style={{ padding: '.5rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(p.variants ?? []).length === 0 && <tr><td colSpan={6} style={{ padding: '.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No variants yet.</td></tr>}
                        {sortVariants(p.variants ?? []).map(v => {
                          const key = v.id;
                          const editVal = stockEdits[key] ?? Number(v.stock_count);
                          return (
                            <tr key={v.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '.6rem .75rem', color: v.colour ? 'var(--color-text)' : 'var(--color-text-faint)', fontStyle: v.colour ? 'normal' : 'italic' }}>{v.colour || '—'}</td>
                              <td style={{ padding: '.6rem .75rem', fontWeight: 700 }}>{v.size}</td>
                              <td style={{ padding: '.6rem .75rem' }}><StockBadge count={editVal} threshold={5} /></td>
                              <td style={{ padding: '.6rem .75rem' }}>
                                <input type="number" min={0} value={editVal}
                                  onChange={e => setStockEdits(ed => ({ ...ed, [key]: parseInt(e.target.value) || 0 }))}
                                  style={{ width: '80px', padding: '.3rem .5rem', border: '1px solid var(--color-border)', borderRadius: '.375rem', fontSize: '0.875rem' }} />
                              </td>
                              <td style={{ padding: '.6rem .75rem' }}>
                                <button onClick={() => saveVariantStock(p.id, v.id, v.size, editVal, v.colour)}
                                  disabled={stockSaving[key] || !(key in stockEdits)}
                                  style={{ padding: '.3rem .8rem', borderRadius: '.375rem', background: key in stockEdits ? 'var(--color-primary)' : 'var(--color-surface-offset)', color: key in stockEdits ? 'white' : 'var(--color-text-muted)', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: key in stockEdits ? 'pointer' : 'default' }}>
                                  {stockSaving[key] ? 'Saving…' : 'Save'}
                                </button>
                              </td>
                              <td style={{ padding: '.6rem .75rem' }}>
                                <button onClick={() => deleteVariant(v.id, v.size, v.colour)} disabled={deleting[v.id]}
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
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Add variant:</span>
                      <input value={newColours[p.id] ?? ''} onChange={e => setNewColours(n => ({ ...n, [p.id]: e.target.value }))} placeholder="Colour (optional)"
                        style={{ padding: '.3rem .6rem', border: '1px solid var(--color-border)', borderRadius: '.375rem', fontSize: '0.8rem', width: '140px' }} />
                      {['XS','S','M','L','XL','XXL','Free Size'].map(s => (
                        <button key={s} onClick={() => setNewSizes(n => ({ ...n, [p.id]: s }))}
                          style={{ padding: '.25rem .6rem', borderRadius: '.375rem', border: `1px dashed ${newSizes[p.id] === s ? 'var(--color-primary)' : 'var(--color-border)'}`, background: newSizes[p.id] === s ? 'var(--color-primary-highlight)' : 'white', fontSize: '0.75rem', cursor: 'pointer', color: newSizes[p.id] === s ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{s}</button>
                      ))}
                      <input value={newSizes[p.id] ?? ''} onChange={e => setNewSizes(n => ({ ...n, [p.id]: e.target.value }))} placeholder="Custom size…"
                        style={{ padding: '.3rem .6rem', border: '1px solid var(--color-border)', borderRadius: '.375rem', fontSize: '0.8rem', width: '120px' }}
                        onKeyDown={e => e.key === 'Enter' && addVariant(p.id)} />
                      <button onClick={() => addVariant(p.id)} style={{ padding: '.3rem .7rem', borderRadius: '.375rem', background: 'var(--color-primary)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Images tab ── */}
        {tab === 'images' && <ImagesTab products={products} />}
      </div>
    </main>
  );
}
