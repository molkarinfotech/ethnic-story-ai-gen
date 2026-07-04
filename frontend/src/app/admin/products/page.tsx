'use client';
import { useState, useEffect, useCallback } from 'react';

type Variant = { id: string; size: string; colour: string; stock_count: number; image_url?: string | null };
type Product = {
  id: string; name: string; slug: string; price: number;
  category: string; gender?: string; badge?: string;
  in_stock?: boolean; image?: string;
  variants: Variant[];
};

const SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];
function sortVariants(vs: Variant[]) {
  const letter  = vs.filter(v => SIZE_ORDER.includes(v.size)).sort((a,b) => SIZE_ORDER.indexOf(a.size)-SIZE_ORDER.indexOf(b.size));
  const numeric = vs.filter(v => /^\d/.test(v.size)).sort((a,b) => parseFloat(a.size)-parseFloat(b.size));
  const other   = vs.filter(v => !SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

function totalStock(variants: Variant[]) {
  return variants.reduce((s, v) => s + (v.stock_count ?? 0), 0);
}

function uniqueColours(variants: Variant[]): string[] {
  const seen: Record<string, true> = {};
  const out: string[] = [];
  for (const v of variants) {
    if (v.colour && !seen[v.colour]) { seen[v.colour] = true; out.push(v.colour); }
  }
  return out;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [variantDrafts, setVariantDrafts] = useState<Record<string, number>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    fetch('/api/admin/stock', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data?.error) { setFetchError(data.error); setProducts([]); }
        else setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => { setFetchError(String(e)); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aStock = totalStock(a.variants);
      const bStock = totalStock(b.variants);
      if (aStock === 0 && bStock > 0) return 1;
      if (bStock === 0 && aStock > 0) return -1;
      return 0;
    });

  async function saveVariantStock(variantId: string, productId: string, size: string, colour: string, qty: number) {
    setSaving(s => ({ ...s, [variantId]: true }));
    const res = await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId, product_id: productId, size, colour, stock_count: qty }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Save failed: ${data.error ?? res.status}`); }
    else {
      setProducts(ps => ps.map(p => ({
        ...p,
        variants: p.variants.map(v => v.id === variantId ? { ...v, stock_count: qty } : v),
      })));
    }
    setSaving(s => { const n = { ...s }; delete n[variantId]; return n; });
  }

  async function addVariant(productId: string, size: string, colour: string) {
    if (!size.trim()) return;
    const res = await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, size: size.trim(), colour: colour.trim(), stock_count: 0 }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Add variant failed: ${data.error ?? res.status}`); return; }
    load();
  }

  async function deleteVariant(variantId: string) {
    if (!confirm('Remove this variant?')) return;
    const res = await fetch('/api/admin/stock', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId }),
    });
    if (!res.ok) { const d = await res.json(); alert(`Delete failed: ${d.error ?? res.status}`); return; }
    load();
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(`Delete failed: ${d.error ?? res.status}`); return; }
    setProducts(ps => ps.filter(p => p.id !== id));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '.15rem' }}>Products</h1>
          <p style={{ fontSize: '.78rem', color: '#9ca3af', margin: 0 }}>Manage listings, inventory &amp; images</p>
        </div>
        <a
          href="/admin/products/new"
          style={{ background: '#9d174d', color: 'white', borderRadius: '.5rem', padding: '.5rem 1.1rem', textDecoration: 'none', fontSize: '.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.4rem' }}
        >
          + New product
        </a>
      </div>

      {/* Search */}
      <input
        type="search" placeholder="Search products or category…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '.55rem .85rem', borderRadius: '.5rem', border: '1px solid #e5e7eb', fontSize: '.875rem', marginBottom: '1rem', outline: 'none', boxSizing: 'border-box' }}
      />

      {/* Summary strip */}
      {!loading && !fetchError && (
        <div style={{ fontSize: '.75rem', color: '#9ca3af', marginBottom: '.75rem', display: 'flex', gap: '1rem' }}>
          <span>{filtered.length} product{filtered.length !== 1 ? 's' : ''}{search && ` matching "${search}"`}</span>
          {filtered.filter(p => totalStock(p.variants) === 0).length > 0 && (
            <span style={{ color: '#991b1b', fontWeight: 600 }}>⚠ {filtered.filter(p => totalStock(p.variants) === 0).length} out of stock</span>
          )}
        </div>
      )}

      {loading && <p style={{ color: '#6b7280', fontSize: '.875rem', textAlign: 'center', padding: '2rem' }}>Loading…</p>}

      {fetchError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '.65rem', padding: '.75rem 1rem', color: '#dc2626', fontSize: '.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ Error loading products: {fetchError}</span>
          <button onClick={load} style={{ background: '#9d174d', color: 'white', border: 'none', borderRadius: '.4rem', padding: '.25rem .65rem', fontSize: '.78rem', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {!loading && !fetchError && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>👗</div>
          <p style={{ fontWeight: 600, color: '#6b7280' }}>No products found</p>
          {search && <p style={{ fontSize: '.8rem', marginTop: '.25rem' }}>Try a different search term</p>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {filtered.map(p => {
          const total = totalStock(p.variants);
          const low = total > 0 && total <= 5;
          const isOpen = expandedId === p.id;
          const colours = uniqueColours(p.variants);

          return (
            <div key={p.id} style={{ background: 'white', borderRadius: '.7rem', border: `1px solid ${total === 0 ? '#fecaca' : '#fce7f3'}`, boxShadow: '0 1px 3px rgba(0,0,0,.04)', overflow: 'hidden', opacity: total === 0 ? .85 : 1 }}>

              {/* Product row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', padding: '.75rem 1rem', flexWrap: 'wrap' }}>

                {/* Thumbnail */}
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} width={44} height={44}
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0, border: '1px solid #fce7f3' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '.4rem', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, border: '1px solid #fce7f3' }}>👗</div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                    {p.badge && <span style={{ marginLeft: '.35rem', fontSize: '.63rem', background: '#fce7f3', color: '#9d174d', borderRadius: '2rem', padding: '.1rem .4rem', fontWeight: 700 }}>{p.badge}</span>}
                  </div>
                  <div style={{ fontSize: '.73rem', color: '#6b7280', marginTop: '.1rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                    <span>{p.category}</span>
                    {p.gender && <span>· {p.gender}</span>}
                    <span>· <strong style={{ color: '#111827' }}>A${p.price}</strong></span>
                    {colours.length > 0 && <span>· {colours.length} colour{colours.length !== 1 ? 's' : ''}</span>}
                  </div>
                </div>

                {/* Stock badge */}
                <span style={{
                  fontSize: '.71rem', fontWeight: 700, borderRadius: '2rem', padding: '.2rem .55rem', flexShrink: 0,
                  background: total === 0 ? '#fee2e2' : low ? '#fef9c3' : '#dcfce7',
                  color: total === 0 ? '#991b1b' : low ? '#854d0e' : '#166534',
                }}>
                  {total === 0 ? '⚠ Out of stock' : low ? `⚠ ${total} left` : `${total} units`}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '.35rem', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : p.id)}
                    title="Quick stock edit"
                    style={{ fontSize: '.75rem', fontWeight: 600, background: isOpen ? '#9d174d' : '#fdf2f8', color: isOpen ? 'white' : '#9d174d', border: 'none', borderRadius: '.4rem', padding: '.32rem .65rem', cursor: 'pointer' }}
                  >
                    {isOpen ? '▲ Close' : '▼ Stock'}
                  </button>
                  <a
                    href={`/admin/products/${p.id}/inventory`}
                    title="Manage images & full inventory"
                    style={{ fontSize: '.75rem', fontWeight: 600, color: 'white', background: '#7c3aed', borderRadius: '.4rem', padding: '.32rem .65rem', textDecoration: 'none' }}
                  >
                    📸 Manage
                  </a>
                  <a
                    href={`/admin/products/${p.id}/edit`}
                    title="Edit product details"
                    style={{ fontSize: '.75rem', fontWeight: 600, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '.4rem', padding: '.32rem .55rem', textDecoration: 'none' }}
                  >✏️</a>
                  <button
                    onClick={() => deleteProduct(p.id, p.name)}
                    title="Delete product"
                    style={{ fontSize: '.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '.3rem .35rem' }}
                  >🗑</button>
                </div>
              </div>

              {/* Inline stock panel */}
              {isOpen && (
                <InventoryPanel
                  product={p}
                  variantDrafts={variantDrafts}
                  setVariantDrafts={setVariantDrafts}
                  saving={saving}
                  onSave={saveVariantStock}
                  onAdd={addVariant}
                  onDelete={deleteVariant}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventoryPanel({
  product, variantDrafts, setVariantDrafts, saving, onSave, onAdd, onDelete,
}: {
  product: Product;
  variantDrafts: Record<string, number>;
  setVariantDrafts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  saving: Record<string, boolean>;
  onSave: (vid: string, pid: string, size: string, colour: string, qty: number) => Promise<void>;
  onAdd: (pid: string, size: string, colour: string) => Promise<void>;
  onDelete: (vid: string) => Promise<void>;
}) {
  const [newSize, setNewSize] = useState('');
  const [newColour, setNewColour] = useState('');
  const [adding, setAdding] = useState(false);

  const byColour: Record<string, typeof product.variants> = {};
  const noColour: typeof product.variants = [];
  for (const v of sortVariants(product.variants)) {
    if (v.colour) {
      if (!byColour[v.colour]) byColour[v.colour] = [];
      byColour[v.colour].push(v);
    } else {
      noColour.push(v);
    }
  }
  const colourGroups = Object.entries(byColour);
  if (noColour.length > 0) colourGroups.push(['No colour', noColour]);

  function draftValue(v: typeof product.variants[0]) {
    return variantDrafts[v.id] ?? v.stock_count;
  }

  return (
    <div style={{ borderTop: '1px solid #fce7f3', background: '#fffbfd', padding: '.85rem 1rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
        <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#9d174d', textTransform: 'uppercase', letterSpacing: '.05em' }}>Quick stock edit</div>
        <a href={`/admin/products/${product.id}/inventory`} style={{ fontSize: '.72rem', color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>Full manage (images + stock) →</a>
      </div>

      {colourGroups.length === 0 && (
        <p style={{ fontSize: '.8rem', color: '#9ca3af', marginBottom: '.75rem' }}>No variants yet — add one below or use Full Manage to upload images.</p>
      )}

      {colourGroups.map(([colour, variants]) => (
        <div key={colour} style={{ marginBottom: '.85rem' }}>
          {colour !== 'No colour' && (
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '.3rem', textTransform: 'capitalize' }}>🎨 {colour}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
            {variants.map(v => {
              const qty = draftValue(v);
              const isDirty = variantDrafts[v.id] !== undefined && variantDrafts[v.id] !== v.stock_count;
              return (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', gap: '.4rem',
                  background: 'white', border: `1px solid ${qty === 0 ? '#fecaca' : qty <= 3 ? '#fef08a' : '#e5e7eb'}`,
                  borderRadius: '.45rem', padding: '.3rem .5rem',
                }}>
                  <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#374151', minWidth: '2rem' }}>{v.size}</span>
                  <input
                    type="number" min={0} value={qty}
                    onChange={e => setVariantDrafts(d => ({ ...d, [v.id]: parseInt(e.target.value) || 0 }))}
                    style={{ width: '3.2rem', padding: '.18rem .3rem', border: '1px solid #e5e7eb', borderRadius: '.3rem', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}
                  />
                  {isDirty && (
                    <button
                      disabled={saving[v.id]}
                      onClick={() => onSave(v.id, product.id, v.size, v.colour, qty)}
                      style={{ fontSize: '.7rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.3rem', padding: '.2rem .4rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {saving[v.id] ? '…' : '✓'}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(v.id)}
                    style={{ fontSize: '.62rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '.1rem' }}
                    title="Remove"
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add variant row */}
      <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Size (S, M, 32…)" value={newSize} onChange={e => setNewSize(e.target.value)}
          style={{ flex: '1 1 80px', minWidth: '70px', padding: '.3rem .5rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.78rem', outline: 'none' }}
        />
        <input
          placeholder="Colour" value={newColour} onChange={e => setNewColour(e.target.value)}
          style={{ flex: '1 1 90px', minWidth: '80px', padding: '.3rem .5rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.78rem', outline: 'none' }}
        />
        <button
          disabled={adding || !newSize.trim()}
          onClick={async () => {
            setAdding(true);
            await onAdd(product.id, newSize, newColour);
            setNewSize(''); setNewColour('');
            setAdding(false);
          }}
          style={{ padding: '.3rem .7rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.4rem', fontSize: '.78rem', fontWeight: 600, cursor: adding ? 'default' : 'pointer', opacity: adding ? .6 : 1 }}
        >
          {adding ? '…' : '+ Add size'}
        </button>
      </div>
    </div>
  );
}
