'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

type ProductImage = { id: string; colour: string; url: string; sort_order: number };
type Variant = { id: string; size: string; colour: string; stock_count: number; image_url?: string | null };
type Product = {
  id: string; name: string; slug: string; price: number;
  category: string; gender?: string; badge?: string;
  in_stock?: boolean; image?: string;
  variants: Variant[];
};
type Category = { id: string; slug: string; label: string; genders: string[] };

const INTERNAL_SIZES = new Set(['__colour__', 'TBA']);
const SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];

function sortVariants(vs: Variant[]) {
  const real    = vs.filter(v => !INTERNAL_SIZES.has(v.size));
  const letter  = real.filter(v => SIZE_ORDER.includes(v.size)).sort((a,b) => SIZE_ORDER.indexOf(a.size)-SIZE_ORDER.indexOf(b.size));
  const numeric = real.filter(v => /^\d/.test(v.size)).sort((a,b) => parseFloat(a.size)-parseFloat(b.size));
  const other   = real.filter(v => !SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

function totalStock(variants: Variant[]) {
  return variants
    .filter(v => !INTERNAL_SIZES.has(v.size))
    .reduce((s,v) => s + (v.stock_count ?? 0), 0);
}

function uniqueColours(variants: Variant[], images: ProductImage[]): string[] {
  const seen: Record<string,true> = {};
  const out: string[] = [];
  const all = [
    ...variants.map(v => v.colour),
    ...images.map(i => i.colour),
  ];
  for (const c of all) {
    const trimmed = (c ?? '').trim();
    if (trimmed && !seen[trimmed]) { seen[trimmed] = true; out.push(trimmed); }
  }
  return out.sort();
}

// ── pill helper ──────────────────────────────────────────────
function Pill({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '.3rem',
        padding: '.28rem .75rem',
        borderRadius: '2rem',
        border: active ? '1.5px solid #9d174d' : '1.5px solid #e5e7eb',
        background: active ? '#9d174d' : 'white',
        color: active ? 'white' : '#374151',
        fontSize: '.76rem',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all .12s',
        boxShadow: active ? '0 2px 8px rgba(157,23,77,.18)' : 'none',
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? 'rgba(255,255,255,.22)' : '#f3f4f6',
          color: active ? 'white' : '#6b7280',
          borderRadius: '2rem',
          padding: '0 .38rem',
          fontSize: '.66rem',
          fontWeight: 700,
          minWidth: '1.1rem',
          textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  );
}

export default function AdminProductsPage() {
  const [products,      setProducts]     = useState<Product[]>([]);
  const [categories,    setCategories]   = useState<Category[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [search,        setSearch]       = useState('');
  const [filterCat,     setFilterCat]    = useState('');
  const [filterGender,  setFilterGender] = useState('');
  const [filterStock,   setFilterStock]  = useState('');
  const [expandedId,    setExpandedId]   = useState<string | null>(null);
  const [saving,        setSaving]       = useState<Record<string,boolean>>({});
  const [variantDrafts, setVariantDrafts]= useState<Record<string,number>>({});
  const [fetchError,    setFetchError]   = useState<string | null>(null);
  const [imageMap,      setImageMap]     = useState<Record<string, ProductImage[]>>({});
  const [imagesLoaded,  setImagesLoaded] = useState<Record<string,boolean>>({});
  const [selectedIds,   setSelectedIds]  = useState<Set<string>>(new Set());
  const [bulkDeleting,  setBulkDeleting] = useState(false);

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

  useEffect(() => {
    fetch('/api/admin/categories', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const loadImages = useCallback(async (productId: string) => {
    if (imagesLoaded[productId]) return;
    setImagesLoaded(m => ({ ...m, [productId]: true }));
    try {
      const res  = await fetch(`/api/product-images/${productId}`, { credentials: 'include' });
      const data = await res.json();
      setImageMap(m => ({ ...m, [productId]: Array.isArray(data) ? data : [] }));
    } catch {
      setImageMap(m => ({ ...m, [productId]: [] }));
    }
  }, [imagesLoaded]);

  function toggleExpand(productId: string) {
    if (expandedId === productId) {
      setExpandedId(null);
    } else {
      setExpandedId(productId);
      loadImages(productId);
    }
  }

  // Derive unique genders from loaded products
  const allGenders = Array.from(new Set(products.map(p => p.gender).filter(Boolean) as string[])).sort();

  // Derive unique categories from loaded products (not from API — reflects actual inventory)
  const allCategories = Array.from(
    new Set(products.map(p => p.category).filter(Boolean))
  ).sort();

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        p.name.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q);
      const matchCat    = !filterCat    || p.category === filterCat;
      const matchGender = !filterGender || p.gender   === filterGender;
      const stock = totalStock(p.variants);
      const matchStock  = !filterStock ||
        (filterStock === 'out' && stock === 0) ||
        (filterStock === 'low' && stock > 0 && stock <= 5) ||
        (filterStock === 'in'  && stock > 5);
      return matchSearch && matchCat && matchGender && matchStock;
    })
    .sort((a, b) => {
      const aS = totalStock(a.variants);
      const bS = totalStock(b.variants);
      if (aS === 0 && bS > 0) return 1;
      if (bS === 0 && aS > 0) return -1;
      return 0;
    });

  function resetFilters() {
    setSearch(''); setFilterCat(''); setFilterGender(''); setFilterStock('');
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Permanently delete ${count} product${count > 1 ? 's' : ''} and all their photos? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/products/bulk-delete', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? res.status);
      }
      setProducts(ps => ps.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (e: unknown) {
      alert('Bulk delete failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBulkDeleting(false);
    }
  }

  async function saveVariantStock(variantId: string, productId: string, size: string, colour: string, qty: number) {
    setSaving(s => ({ ...s, [variantId]: true }));
    const res = await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId, product_id: productId, size, colour, stock_count: qty }),
    });
    const data = await res.json();
    if (!res.ok) alert(`Save failed: ${data.error ?? res.status}`);
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
    if (!res.ok) { alert(`Add size failed: ${data.error ?? res.status}`); return; }
    load();
  }

  async function deleteVariant(variantId: string) {
    if (!confirm('Remove this size?')) return;
    const res = await fetch('/api/admin/stock', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId }),
    });
    if (!res.ok) { const d = await res.json(); alert(`Delete failed: ${d.error ?? res.status}`); return; }
    load();
  }

  async function addColourGroup(productId: string, colourName: string) {
    const name = colourName.trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    if (!name) return;
    const res = await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, size: '__colour__', colour: name, stock_count: 0 }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(`Failed: ${d.error ?? res.status}`); return; }
    setProducts(ps => ps.map(p => {
      if (p.id !== productId) return p;
      const already = p.variants.some(v => v.colour === name && v.size === '__colour__');
      if (already) return p;
      return {
        ...p,
        variants: [...p.variants, { id: `tmp-${Date.now()}`, size: '__colour__', colour: name, stock_count: 0, image_url: null }],
      };
    }));
  }

  async function deleteImage(productId: string, imageId: string) {
    if (!confirm('Remove this image?')) return;
    await fetch(`/api/product-images/${productId}?id=${imageId}`, { method: 'DELETE', credentials: 'include' });
    setImageMap(m => ({ ...m, [productId]: (m[productId] ?? []).filter(i => i.id !== imageId) }));
  }

  async function uploadFiles(productId: string, colour: string, files: File[]) {
    const existingForColour = (imageMap[productId] ?? []).filter(i => i.colour === colour);
    let baseOrder = existingForColour.length;
    const newImgs: ProductImage[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const fd = new FormData();
      fd.append('image',      file);
      fd.append('product_id', productId);
      fd.append('colour',     colour || 'Unassigned');
      fd.append('sort_order', String(baseOrder++));
      const res = await fetch('/api/admin/scan-upload', { method: 'POST', credentials: 'include', body: fd });
      if (res.ok) {
        const d = await res.json();
        if (d?.image) newImgs.push(d.image as ProductImage);
      }
    }
    if (newImgs.length) setImageMap(m => ({ ...m, [productId]: [...(m[productId] ?? []), ...newImgs] }));
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(`Delete failed: ${d.error ?? res.status}`); return; }
    setProducts(ps => ps.filter(p => p.id !== id));
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const hasFilters = !!(search || filterCat || filterGender || filterStock);

  // Count helpers for pills
  function countByGender(g: string)  { return products.filter(p => p.gender === g).length; }
  function countByCat(c: string)     { return products.filter(p => p.category === c).length; }
  function countByStock(s: string)   {
    return products.filter(p => {
      const st = totalStock(p.variants);
      if (s === 'out') return st === 0;
      if (s === 'low') return st > 0 && st <= 5;
      if (s === 'in')  return st > 5;
      return false;
    }).length;
  }

  const outCount = countByStock('out');
  const lowCount = countByStock('low');

  return (
    <div>
      <style>{`
        .pill-row { display: flex; gap: .35rem; flex-wrap: wrap; align-items: center; }
        .pill-section-label {
          font-size: .67rem; font-weight: 700; color: #9ca3af;
          text-transform: uppercase; letter-spacing: .07em;
          white-space: nowrap; margin-right: .1rem;
        }
        .pill-divider {
          width: 1px; height: 20px; background: #e5e7eb;
          margin: 0 .35rem; flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .pill-divider { display: none; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '.15rem' }}>Products</h1>
          <p style={{ fontSize: '.78rem', color: '#9ca3af', margin: 0 }}>Manage listings, stock &amp; images</p>
        </div>
        <a
          href="/admin/products/new"
          style={{ background: '#9d174d', color: 'white', borderRadius: '.5rem', padding: '.5rem 1.1rem', textDecoration: 'none', fontSize: '.82rem', fontWeight: 700 }}
        >+ New product</a>
      </div>

      {/* ── Search bar ── */}
      <div style={{ marginBottom: '.9rem' }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedIds(new Set()); }}
            style={{
              width: '100%',
              padding: '.45rem .75rem .45rem 2.2rem',
              border: '1.5px solid #e5e7eb',
              borderRadius: '.55rem',
              fontSize: '.85rem',
              background: 'white',
              outline: 'none',
              color: '#111827',
            }}
          />
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem', marginBottom: '1rem', padding: '.7rem .85rem', background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: '.7rem' }}>

        {/* Group / Gender pills */}
        {allGenders.length > 0 && (
          <div className="pill-row">
            <span className="pill-section-label">Group</span>
            <Pill label="All" active={!filterGender} count={products.length} onClick={() => { setFilterGender(''); setSelectedIds(new Set()); }} />
            {allGenders.map(g => (
              <Pill
                key={g}
                label={g.charAt(0).toUpperCase() + g.slice(1)}
                active={filterGender === g}
                count={countByGender(g)}
                onClick={() => { setFilterGender(filterGender === g ? '' : g); setSelectedIds(new Set()); }}
              />
            ))}
          </div>
        )}

        {/* Category pills — dynamically from actual products */}
        {allCategories.length > 0 && (
          <div className="pill-row">
            <span className="pill-section-label">Category</span>
            <Pill label="All" active={!filterCat} onClick={() => { setFilterCat(''); setSelectedIds(new Set()); }} />
            {allCategories.map(c => (
              <Pill
                key={c}
                label={c}
                active={filterCat === c}
                count={countByCat(c)}
                onClick={() => { setFilterCat(filterCat === c ? '' : c); setSelectedIds(new Set()); }}
              />
            ))}
          </div>
        )}

        {/* Stock status pills */}
        <div className="pill-row">
          <span className="pill-section-label">Stock</span>
          <Pill label="All" active={!filterStock} onClick={() => { setFilterStock(''); setSelectedIds(new Set()); }} />
          <Pill label="In stock" active={filterStock === 'in'}  count={countByStock('in')}  onClick={() => { setFilterStock(filterStock === 'in'  ? '' : 'in');  setSelectedIds(new Set()); }} />
          {lowCount > 0 && (
            <Pill label="⚠ Low (≤5)" active={filterStock === 'low'} count={lowCount} onClick={() => { setFilterStock(filterStock === 'low' ? '' : 'low'); setSelectedIds(new Set()); }} />
          )}
          {outCount > 0 && (
            <Pill label="⛔ Out of stock" active={filterStock === 'out'} count={outCount} onClick={() => { setFilterStock(filterStock === 'out' ? '' : 'out'); setSelectedIds(new Set()); }} />
          )}
        </div>

        {hasFilters && (
          <div>
            <button
              onClick={resetFilters}
              style={{ fontSize: '.73rem', color: '#9d174d', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline' }}
            >✕ Clear all filters</button>
          </div>
        )}
      </div>

      {/* Summary + Select All */}
      {!loading && !fetchError && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '.75rem', color: '#9ca3af', marginBottom: '.75rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleSelectAll}
              style={{ width: 15, height: 15, accentColor: '#9d174d', cursor: 'pointer' }}
            />
            Select all
          </label>
          <span>{filtered.length} product{filtered.length !== 1 ? 's' : ''}{hasFilters ? ' matching filters' : ''}</span>
          {filtered.filter(p => totalStock(p.variants) === 0).length > 0 && (
            <span style={{ color: '#991b1b', fontWeight: 600 }}>⚠ {filtered.filter(p => totalStock(p.variants) === 0).length} out of stock</span>
          )}
        </div>
      )}

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.75rem',
          background: '#fff1f2', border: '1.5px solid #fca5a5',
          borderRadius: '.7rem', padding: '.6rem 1rem',
          marginBottom: '1rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 700, color: '#9d174d', fontSize: '.88rem' }}>{selectedIds.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            style={{ background: '#be123c', color: 'white', border: 'none', borderRadius: '.45rem', padding: '.38rem .9rem', cursor: bulkDeleting ? 'default' : 'pointer', fontSize: '.83rem', fontWeight: 700, opacity: bulkDeleting ? .65 : 1 }}
          >
            {bulkDeleting ? 'Deleting…' : `🗑 Delete ${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''}`}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '.45rem', padding: '.38rem .7rem', color: '#6b7280', cursor: 'pointer', fontSize: '.83rem' }}
          >Clear</button>
        </div>
      )}

      {loading && <p style={{ color: '#6b7280', fontSize: '.875rem', textAlign: 'center', padding: '2rem' }}>Loading…</p>}

      {fetchError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '.65rem', padding: '.75rem 1rem', color: '#dc2626', fontSize: '.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {fetchError}</span>
          <button onClick={load} style={{ background: '#9d174d', color: 'white', border: 'none', borderRadius: '.4rem', padding: '.25rem .65rem', fontSize: '.78rem', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {!loading && !fetchError && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>👗</div>
          <p style={{ fontWeight: 600, color: '#6b7280' }}>No products found</p>
          {hasFilters && (
            <button onClick={resetFilters} style={{ marginTop: '.5rem', fontSize: '.8rem', color: '#9d174d', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear filters</button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {filtered.map(p => {
          const total    = totalStock(p.variants);
          const low      = total > 0 && total <= 5;
          const isOpen   = expandedId === p.id;
          const images   = imageMap[p.id] ?? [];
          const colours  = uniqueColours(p.variants, images);
          const selected = selectedIds.has(p.id);

          return (
            <div key={p.id} style={{
              background: 'white', borderRadius: '.7rem',
              border: `1.5px solid ${selected ? '#9d174d' : total === 0 ? '#fecaca' : '#fce7f3'}`,
              boxShadow: selected ? '0 0 0 3px rgba(157,23,77,.1)' : '0 1px 3px rgba(0,0,0,.04)',
              overflow: 'hidden',
              opacity: total === 0 && !selected ? .88 : 1,
              transition: 'border-color .12s, box-shadow .12s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', padding: '.75rem 1rem', flexWrap: 'wrap' }}>
                <input
                  type="checkbox" checked={selected}
                  onChange={() => toggleSelect(p.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 16, height: 16, accentColor: '#9d174d', cursor: 'pointer', flexShrink: 0 }}
                />
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} width={44} height={44}
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0, border: '1px solid #fce7f3' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '.4rem', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, border: '1px solid #fce7f3' }}>👗</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                    {p.badge && <span style={{ marginLeft: '.35rem', fontSize: '.63rem', background: '#fce7f3', color: '#9d174d', borderRadius: '2rem', padding: '.1rem .4rem', fontWeight: 700 }}>{p.badge}</span>}
                  </div>
                  <div style={{ fontSize: '.73rem', color: '#6b7280', marginTop: '.1rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                    <span style={{ background: '#fdf2f8', color: '#9d174d', padding: '.05rem .4rem', borderRadius: '2rem', fontWeight: 600 }}>{p.category}</span>
                    {p.gender && <span style={{ background: '#f0fdf4', color: '#166534', padding: '.05rem .4rem', borderRadius: '2rem', fontWeight: 600 }}>{p.gender}</span>}
                    <span>· <strong style={{ color: '#111827' }}>A${p.price}</strong></span>
                    {colours.length > 0 && <span>· {colours.length} colour{colours.length !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <span style={{
                  fontSize: '.71rem', fontWeight: 700, borderRadius: '2rem', padding: '.2rem .55rem', flexShrink: 0,
                  background: total === 0 ? '#fee2e2' : low ? '#fef9c3' : '#dcfce7',
                  color:      total === 0 ? '#991b1b' : low ? '#854d0e' : '#166534',
                }}>
                  {total === 0 ? '⚠ Out of stock' : low ? `⚠ ${total} left` : `${total} units`}
                </span>
                <div style={{ display: 'flex', gap: '.35rem', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    onClick={() => toggleExpand(p.id)}
                    style={{ fontSize: '.75rem', fontWeight: 600, background: isOpen ? '#9d174d' : '#fdf2f8', color: isOpen ? 'white' : '#9d174d', border: 'none', borderRadius: '.4rem', padding: '.32rem .65rem', cursor: 'pointer' }}
                  >{isOpen ? '▲ Close' : '▼ Manage'}</button>
                  <a
                    href={`/admin/products/${p.id}/edit`}
                    style={{ fontSize: '.75rem', fontWeight: 600, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '.4rem', padding: '.32rem .55rem', textDecoration: 'none' }}
                    title="Edit product details"
                  >✏️</a>
                  <button
                    onClick={() => deleteProduct(p.id, p.name)}
                    style={{ fontSize: '.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '.3rem .35rem' }}
                    title="Delete product"
                  >🗑</button>
                </div>
              </div>

              {isOpen && (
                <ExpandedPanel
                  product={p}
                  images={images}
                  colours={colours}
                  variantDrafts={variantDrafts}
                  setVariantDrafts={setVariantDrafts}
                  saving={saving}
                  onSave={saveVariantStock}
                  onAddVariant={addVariant}
                  onDeleteVariant={deleteVariant}
                  onAddColour={(name) => addColourGroup(p.id, name)}
                  onDeleteImage={(imgId) => deleteImage(p.id, imgId)}
                  onUploadFiles={(colour, files) => uploadFiles(p.id, colour, files)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════ ExpandedPanel ═══════════════════════ */
function ExpandedPanel({
  product, images, colours, variantDrafts, setVariantDrafts, saving,
  onSave, onAddVariant, onDeleteVariant, onAddColour, onDeleteImage, onUploadFiles,
}: {
  product:          Product;
  images:           ProductImage[];
  colours:          string[];
  variantDrafts:    Record<string,number>;
  setVariantDrafts: React.Dispatch<React.SetStateAction<Record<string,number>>>;
  saving:           Record<string,boolean>;
  onSave:           (vid: string, pid: string, size: string, colour: string, qty: number) => Promise<void>;
  onAddVariant:     (pid: string, size: string, colour: string) => Promise<void>;
  onDeleteVariant:  (vid: string) => Promise<void>;
  onAddColour:      (name: string) => Promise<void>;
  onDeleteImage:    (imgId: string) => Promise<void>;
  onUploadFiles:    (colour: string, files: File[]) => Promise<void>;
}) {
  const [showColourForm, setShowColourForm] = useState(false);
  const [newColourName,  setNewColourName]  = useState('');
  const [addingColour,   setAddingColour]   = useState(false);

  async function submitColour() {
    const name = newColourName.trim();
    if (!name) return;
    setAddingColour(true);
    await onAddColour(name);
    setNewColourName('');
    setShowColourForm(false);
    setAddingColour(false);
  }

  function variantsByColour(c: string) {
    return sortVariants(product.variants.filter(v => v.colour === c));
  }
  function imagesByColour(c: string) {
    return images.filter(i => i.colour === c).sort((a,b) => a.sort_order - b.sort_order);
  }
  const noColourVariants = sortVariants(product.variants.filter(v => !v.colour || v.colour.trim() === ''));

  return (
    <div style={{ borderTop: '1px solid #fce7f3', background: '#fffbfd', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#9d174d', textTransform: 'uppercase', letterSpacing: '.05em' }}>Images &amp; Stock</span>
        <button
          onClick={() => setShowColourForm(v => !v)}
          style={{ fontSize: '.75rem', fontWeight: 700, background: '#7c3aed', color: 'white', border: 'none', borderRadius: '.4rem', padding: '.3rem .7rem', cursor: 'pointer' }}
        >+ Add colour</button>
      </div>

      {showColourForm && (
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap', background: 'white', border: '1px solid #ede9fe', borderRadius: '.55rem', padding: '.6rem .75rem', marginBottom: '.85rem' }}>
          <span style={{ fontSize: '.78rem', fontWeight: 600, color: '#7c3aed', whiteSpace: 'nowrap' }}>Colour name:</span>
          <input
            value={newColourName}
            onChange={e => setNewColourName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitColour(); } }}
            placeholder="e.g. Maroon, Royal Blue…"
            autoFocus
            style={{ flex: 1, minWidth: '140px', padding: '.35rem .5rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.8rem', outline: 'none' }}
          />
          <button
            disabled={!newColourName.trim() || addingColour}
            onClick={submitColour}
            style={{ padding: '.35rem .75rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '.4rem', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', opacity: newColourName.trim() && !addingColour ? 1 : .5 }}
          >{addingColour ? 'Saving…' : 'Add'}</button>
          <button
            onClick={() => { setShowColourForm(false); setNewColourName(''); }}
            style={{ padding: '.35rem .55rem', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.78rem', cursor: 'pointer' }}
          >Cancel</button>
        </div>
      )}

      {colours.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.35rem' }}>🎨</div>
          <p style={{ fontWeight: 600, color: '#6b7280', fontSize: '.82rem', marginBottom: '.25rem' }}>No colour variants yet</p>
          <p style={{ fontSize: '.75rem' }}>Click &ldquo;+ Add colour&rdquo; above to get started.</p>
        </div>
      )}

      {colours.map(colour => (
        <ColourGroup
          key={colour}
          colour={colour}
          variants={variantsByColour(colour)}
          images={imagesByColour(colour)}
          productId={product.id}
          variantDrafts={variantDrafts}
          setVariantDrafts={setVariantDrafts}
          saving={saving}
          onSave={(vid, size, qty) => onSave(vid, product.id, size, colour, qty)}
          onAddVariant={(size) => onAddVariant(product.id, size, colour)}
          onDeleteVariant={onDeleteVariant}
          onDeleteImage={onDeleteImage}
          onUploadFiles={(files) => onUploadFiles(colour, files)}
        />
      ))}

      {noColourVariants.length > 0 && (
        <div style={{ marginTop: '.5rem', paddingTop: '.75rem', borderTop: '1px dashed #fce7f3' }}>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#9ca3af', marginBottom: '.4rem' }}>NO COLOUR ASSIGNED</div>
          <VariantChips
            variants={noColourVariants} drafts={variantDrafts} saving={saving}
            setDrafts={setVariantDrafts}
            onSave={(vid, size, qty) => onSave(vid, product.id, size, '', qty)}
            onDelete={onDeleteVariant}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ ColourGroup ═══════════════════════ */
function ColourGroup({
  colour, variants, images,
  variantDrafts, setVariantDrafts, saving,
  onSave, onAddVariant, onDeleteVariant, onDeleteImage, onUploadFiles,
}: {
  colour:           string;
  variants:         Variant[];
  images:           ProductImage[];
  productId:        string;
  variantDrafts:    Record<string,number>;
  setVariantDrafts: React.Dispatch<React.SetStateAction<Record<string,number>>>;
  saving:           Record<string,boolean>;
  onSave:           (vid: string, size: string, qty: number) => Promise<void>;
  onAddVariant:     (size: string) => Promise<void>;
  onDeleteVariant:  (vid: string) => Promise<void>;
  onDeleteImage:    (imgId: string) => Promise<void>;
  onUploadFiles:    (files: File[]) => Promise<void>;
}) {
  const [uploading,    setUploading]    = useState(false);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const [showSizeForm, setShowSizeForm] = useState(false);
  const [newSize,      setNewSize]      = useState('');
  const [addingSize,   setAddingSize]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    setUploading(true);
    await onUploadFiles(arr);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const stockTotal = variants.reduce((s,v) => s + (variantDrafts[v.id] ?? v.stock_count), 0);

  return (
    <div style={{ background: 'white', border: '1px solid #fce7f3', borderRadius: '.6rem', marginBottom: '.75rem', overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(to right,#fdf2f8,#fdf8ff)', borderBottom: '1px solid #fce7f3', padding: '.45rem .75rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <span style={{ fontSize: '.95rem' }}>🎨</span>
        <span style={{ fontWeight: 700, fontSize: '.82rem', color: '#9d174d', flex: 1, textTransform: 'capitalize' }}>{colour}</span>
        <span style={{ fontSize: '.68rem', color: '#9ca3af' }}>
          {images.length} img{images.length !== 1 ? 's' : ''}
          {variants.length > 0 && ` · ${variants.length} size${variants.length !== 1 ? 's' : ''} · ${stockTotal} units`}
        </span>
      </div>

      <div style={{ padding: '.65rem .75rem', display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) minmax(160px,1.2fr)', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Photos</div>
          {images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginBottom: '.5rem' }}>
              {images.map((img, idx) => (
                <div key={img.id} style={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`${colour} ${idx+1}`} width={58} height={58}
                    style={{ width: 58, height: 58, objectFit: 'cover', borderRadius: '.35rem', border: '1px solid #fce7f3', display: 'block' }}
                  />
                  {idx === 0 && (
                    <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: '.48rem', background: '#9d174d', color: 'white', borderRadius: '.2rem', padding: '.05rem .25rem', fontWeight: 700, lineHeight: 1.4 }}>MAIN</span>
                  )}
                  <button
                    onClick={() => onDeleteImage(img.id)}
                    style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, background: 'rgba(0,0,0,.55)', color: 'white', border: 'none', borderRadius: '50%', fontSize: '.55rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
            onClick={() => !uploading && fileRef.current?.click()}
            style={{ border: `2px dashed ${isDragOver ? '#9d174d' : '#fce7f3'}`, borderRadius: '.45rem', padding: '.55rem .5rem', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: isDragOver ? '#fdf2f8' : '#fffbfd', transition: 'border-color .15s, background .15s' }}
          >
            {uploading ? (
              <span style={{ fontSize: '.72rem', color: '#9d174d', fontWeight: 600 }}>Uploading… ⏳</span>
            ) : (
              <>
                <div style={{ fontSize: '1.1rem', marginBottom: '.1rem' }}>📤</div>
                <div style={{ fontSize: '.7rem', color: '#6b7280', fontWeight: 600 }}>{images.length ? 'Add more' : 'Upload images'}</div>
                <div style={{ fontSize: '.62rem', color: '#9ca3af' }}>Click or drag · JPG PNG WEBP</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
          />
        </div>

        <div>
          <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Sizes &amp; Stock</div>
          {variants.length === 0 ? (
            <p style={{ fontSize: '.73rem', color: '#9ca3af', marginBottom: '.5rem' }}>No sizes yet — add one below.</p>
          ) : (
            <div style={{ marginBottom: '.4rem' }}>
              <VariantChips variants={variants} drafts={variantDrafts} saving={saving} setDrafts={setVariantDrafts} onSave={onSave} onDelete={onDeleteVariant} />
            </div>
          )}
          {!showSizeForm ? (
            <button
              onClick={() => setShowSizeForm(true)}
              style={{ fontSize: '.7rem', color: '#9d174d', background: '#fdf2f8', border: '1px dashed #fce7f3', borderRadius: '.35rem', padding: '.25rem .55rem', cursor: 'pointer', fontWeight: 600 }}
            >+ Add size</button>
          ) : (
            <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="S / M / 38…" value={newSize}
                onChange={e => setNewSize(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSize.trim()) {
                    e.preventDefault();
                    setAddingSize(true);
                    onAddVariant(newSize.trim()).then(() => { setNewSize(''); setShowSizeForm(false); setAddingSize(false); });
                  }
                }}
                autoFocus
                style={{ flex: '1 1 55px', minWidth: '50px', padding: '.28rem .4rem', border: '1px solid #e5e7eb', borderRadius: '.35rem', fontSize: '.75rem', outline: 'none' }}
              />
              <button
                disabled={addingSize || !newSize.trim()}
                onClick={async () => { setAddingSize(true); await onAddVariant(newSize.trim()); setNewSize(''); setShowSizeForm(false); setAddingSize(false); }}
                style={{ padding: '.28rem .5rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.35rem', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', opacity: addingSize || !newSize.trim() ? .6 : 1 }}
              >{addingSize ? '…' : 'Add'}</button>
              <button
                onClick={() => { setShowSizeForm(false); setNewSize(''); }}
                style={{ padding: '.28rem .4rem', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '.35rem', fontSize: '.72rem', cursor: 'pointer' }}
              >✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ VariantChips ═══════════════════════ */
function VariantChips({ variants, drafts, saving, setDrafts, onSave, onDelete }: {
  variants: Variant[];
  drafts:   Record<string,number>;
  saving:   Record<string,boolean>;
  setDrafts:React.Dispatch<React.SetStateAction<Record<string,number>>>;
  onSave:   (vid: string, size: string, qty: number) => Promise<void>;
  onDelete: (vid: string) => Promise<void>;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
      {variants.map(v => {
        const qty     = drafts[v.id] ?? v.stock_count;
        const isDirty = drafts[v.id] !== undefined && drafts[v.id] !== v.stock_count;
        return (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', background: qty === 0 ? '#fff5f5' : 'white', border: `1px solid ${qty === 0 ? '#fecaca' : qty <= 3 ? '#fef08a' : '#e5e7eb'}`, borderRadius: '.4rem', padding: '.25rem .4rem' }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#374151', minWidth: '1.6rem' }}>{v.size}</span>
            <input
              type="number" min={0} value={qty}
              onChange={e => setDrafts(d => ({ ...d, [v.id]: parseInt(e.target.value) || 0 }))}
              style={{ width: '2.8rem', padding: '.15rem .25rem', border: '1px solid #e5e7eb', borderRadius: '.28rem', fontSize: '.75rem', textAlign: 'center', outline: 'none' }}
            />
            {isDirty && (
              <button
                disabled={saving[v.id]}
                onClick={() => onSave(v.id, v.size, qty)}
                style={{ fontSize: '.65rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.28rem', padding: '.15rem .3rem', cursor: 'pointer', fontWeight: 700 }}
              >{saving[v.id] ? '…' : '✓'}</button>
            )}
            <button
              onClick={() => onDelete(v.id)}
              style={{ fontSize: '.58rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '.08rem' }}
              title="Remove size"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
