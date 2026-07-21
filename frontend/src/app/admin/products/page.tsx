'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

type ProductImage = { id: string; colour: string; url: string; sort_order: number };
type Variant = { id: string; size: string; colour: string; stock_count: number; image_url?: string | null };
type Product = {
  id: string; name: string; slug: string; price: number;
  category: string; gender?: string; badge?: string;
  in_stock?: boolean; image?: string;
  cost_inr?: number | null; landed_cost_aud?: number | null;
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

// ── Pill ────────────────────────────────────────────────────────
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

function PillSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', minWidth: 0 }}>
      <span style={{
        fontSize: '.65rem', fontWeight: 700, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: '.07em',
      }}>{label}</span>
      <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

// ── Inline editable field ────────────────────────────────────────
function InlineField({
  label, value, prefix, suffix, type = 'text', placeholder,
  onSave,
}: {
  label: string; value: string | number | null | undefined;
  prefix?: string; suffix?: string; type?: string; placeholder?: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(value != null ? String(value) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  async function commit() {
    setEditing(false);
    const clean = draft.trim();
    const orig  = value != null ? String(value) : '';
    if (clean === orig) return;
    setSaving(true);
    await onSave(clean);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setEditing(false); }
  }

  const display = value != null && value !== '' ? String(value) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem', minWidth: 0 }}>
      <span style={{ fontSize: '.6rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.2rem' }} onClick={e => e.stopPropagation()}>
          {prefix && <span style={{ fontSize: '.72rem', color: '#6b7280' }}>{prefix}</span>}
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            style={{
              width: type === 'number' ? 70 : 100,
              padding: '.2rem .35rem',
              fontSize: '.78rem',
              border: '1.5px solid #9d174d',
              borderRadius: 5,
              outline: 'none',
              color: '#111827',
            }}
          />
          {suffix && <span style={{ fontSize: '.72rem', color: '#6b7280' }}>{suffix}</span>}
        </div>
      ) : (
        <button
          onClick={startEdit}
          title={`Edit ${label}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '.2rem',
            background: 'none', border: 'none', padding: '.1rem .25rem',
            borderRadius: 4, cursor: 'text',
            fontSize: '.78rem', fontWeight: 600,
            color: display ? '#111827' : '#d1d5db',
            transition: 'background .1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {saving ? (
            <span style={{ fontSize: '.65rem', color: '#9ca3af' }}>saving…</span>
          ) : saved ? (
            <span style={{ fontSize: '.65rem', color: '#16a34a' }}>✓ saved</span>
          ) : (
            <>
              {prefix && <span style={{ color: '#6b7280', fontWeight: 400 }}>{prefix}</span>}
              <span>{display ?? placeholder ?? '—'}</span>
              {suffix && <span style={{ color: '#6b7280', fontWeight: 400 }}>{suffix}</span>}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" style={{ opacity: .6 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Profit calculator chip ───────────────────────────────────────
function ProfitChip({ price, landedCost }: { price: number; landedCost: number | null | undefined }) {
  if (!landedCost || !price) return null;
  const profit = price - landedCost;
  const pct    = ((profit / price) * 100).toFixed(0);
  const ok     = profit > 0;
  return (
    <span style={{
      fontSize: '.65rem', fontWeight: 700,
      background: ok ? '#dcfce7' : '#fee2e2',
      color: ok ? '#15803d' : '#b91c1c',
      borderRadius: '2rem', padding: '.15rem .45rem',
      whiteSpace: 'nowrap',
    }}>
      {ok ? '▲' : '▼'} {ok ? '+' : ''}${profit.toFixed(2)} ({pct}%)
    </span>
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

  // ── Quick-save product field ─────────────────────────────────
  async function saveProductField(productId: string, field: string, raw: string) {
    let value: string | number | null = raw === '' ? null : raw;
    if (field === 'price' || field === 'cost_inr' || field === 'landed_cost_aud') {
      const n = parseFloat(raw);
      value = isNaN(n) ? null : n;
    }
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Save failed: ${d.error ?? res.status}`);
      return;
    }
    setProducts(ps => ps.map(p => p.id === productId ? { ...p, [field]: value } : p));
  }

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

  const allGenders    = Array.from(new Set(products.map(p => p.gender).filter(Boolean) as string[])).sort();
  const allCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();

  const visibleCategories = filterGender
    ? Array.from(new Set(
        products
          .filter(p => p.gender === filterGender)
          .map(p => p.category)
          .filter(Boolean)
      )).sort()
    : allCategories;

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

  const allSelected  = filtered.length > 0 && selectedIds.size === filtered.length;
  const hasFilters   = !!(search || filterCat || filterGender || filterStock);

  function countByGender(g: string)  { return products.filter(p => p.gender === g).length; }
  function countByCat(c: string) {
    return products.filter(p =>
      p.category === c && (!filterGender || p.gender === filterGender)
    ).length;
  }
  function countByStock(s: string) {
    return products.filter(p => {
      const st = totalStock(p.variants);
      if (s === 'out') return st === 0;
      if (s === 'low') return st > 0 && st <= 5;
      if (s === 'in')  return st > 5;
      return false;
    }).length;
  }

  const outCount = countByStock('out');

  const GENDER_DISPLAY: Record<string, string> = {
    women: 'Women', men: 'Men', kids: 'Kids', accessories: 'Accessories',
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '.15rem' }}>Products</h1>
          <p style={{ fontSize: '.78rem', color: '#9ca3af', margin: 0 }}>Manage listings, stock &amp; images · click any field to edit inline</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{
                padding: '.38rem .9rem', borderRadius: '6px',
                background: bulkDeleting ? '#fca5a5' : '#fee2e2',
                color: '#b91c1c', fontWeight: 600, fontSize: '.78rem',
                border: '1px solid #fca5a5', cursor: bulkDeleting ? 'not-allowed' : 'pointer',
              }}
            >
              {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size} selected`}
            </button>
          )}
          <a
            href="/admin/products/new"
            style={{
              padding: '.38rem .9rem', borderRadius: '6px',
              background: '#9d174d', color: 'white',
              fontWeight: 600, fontSize: '.78rem',
              textDecoration: 'none', border: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '.3rem',
            }}
          >
            + Add Product
          </a>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        border: '1px solid #f3f4f6',
        borderRadius: '10px',
        padding: '1rem 1.1rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '.85rem',
      }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '.7rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '.85rem', pointerEvents: 'none' }}>🔍</span>
          <input
            type="search"
            placeholder="Search by name or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '.45rem .75rem .45rem 2rem',
              border: '1.5px solid #e5e7eb', borderRadius: '6px',
              fontSize: '.82rem', color: '#111827',
              outline: 'none',
              transition: 'border-color .15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#9d174d')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
        </div>

        {allGenders.length > 0 && (
          <PillSection label="Gender">
            {allGenders.map(g => (
              <Pill
                key={g}
                label={GENDER_DISPLAY[g] ?? g.charAt(0).toUpperCase() + g.slice(1)}
                active={filterGender === g}
                count={countByGender(g)}
                onClick={() => {
                  const next = filterGender === g ? '' : g;
                  setFilterGender(next);
                  if (next && filterCat) {
                    const stillValid = products.some(p => p.gender === next && p.category === filterCat);
                    if (!stillValid) setFilterCat('');
                  }
                }}
              />
            ))}
          </PillSection>
        )}

        {visibleCategories.length > 0 && (
          <PillSection label={filterGender ? `Categories · ${GENDER_DISPLAY[filterGender] ?? filterGender}` : 'Category'}>
            {visibleCategories.map(c => (
              <Pill
                key={c}
                label={c}
                active={filterCat === c}
                count={countByCat(c)}
                onClick={() => setFilterCat(filterCat === c ? '' : c)}
              />
            ))}
          </PillSection>
        )}

        <PillSection label="Stock">
          <Pill label="In stock"  active={filterStock === 'in'}  count={countByStock('in')}  onClick={() => setFilterStock(filterStock === 'in'  ? '' : 'in')}  />
          <Pill label="Low ≤5"   active={filterStock === 'low'} count={countByStock('low')} onClick={() => setFilterStock(filterStock === 'low' ? '' : 'low')} />
          {outCount > 0 && (
            <Pill label="Out of stock" active={filterStock === 'out'} count={outCount} onClick={() => setFilterStock(filterStock === 'out' ? '' : 'out')} />
          )}
        </PillSection>

        {hasFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.75rem', color: '#6b7280' }}>
              Showing <strong>{filtered.length}</strong> of {products.length} products
            </span>
            <button
              onClick={resetFilters}
              style={{
                fontSize: '.72rem', color: '#9d174d', background: 'none',
                border: '1px solid #fce7f3', borderRadius: '2rem',
                padding: '.18rem .6rem', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Clear filters ×
            </button>
          </div>
        )}
      </div>

      {/* ── Product list ───────────────────────────────────────── */}
      {fetchError && (
        <div style={{ color: '#b91c1c', background: '#fee2e2', borderRadius: 8, padding: '1rem', marginBottom: '1rem', fontSize: '.85rem' }}>
          Error: {fetchError}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 64, borderRadius: 8, background: '#f9fafb', border: '1px solid #f3f4f6',
              backgroundImage: 'linear-gradient(90deg,#f9fafb 25%,#f3f4f6 50%,#f9fafb 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📦</div>
          <div style={{ fontWeight: 600, marginBottom: '.25rem', color: '#374151' }}>No products found</div>
          <div style={{ fontSize: '.8rem' }}>Try adjusting your filters or search term</div>
          {hasFilters && (
            <button onClick={resetFilters} style={{ marginTop: '.75rem', color: '#9d174d', background: 'none', border: '1px solid #fce7f3', borderRadius: '2rem', padding: '.3rem .85rem', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
          {/* Select-all row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.3rem .5rem', fontSize: '.75rem', color: '#9ca3af' }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && !allSelected; }}
              onChange={toggleSelectAll}
              style={{ accentColor: '#9d174d', width: 14, height: 14, cursor: 'pointer' }}
            />
            <span>{selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filtered.length} products`}</span>
          </div>

          {filtered.map(p => {
            const stock      = totalStock(p.variants);
            const colours    = uniqueColours(p.variants, imageMap[p.id] ?? []);
            const isExpanded = expandedId === p.id;
            const isSelected = selectedIds.has(p.id);

            const stockBadge = stock === 0
              ? { label: 'Out of stock', bg: '#fee2e2', color: '#b91c1c' }
              : stock <= 5
              ? { label: `Low · ${stock}`, bg: '#fef9c3', color: '#854d0e' }
              : { label: `${stock} in stock`, bg: '#dcfce7', color: '#15803d' };

            return (
              <div
                key={p.id}
                style={{
                  border: isSelected ? '1.5px solid #9d174d' : '1.5px solid #f3f4f6',
                  borderRadius: '8px',
                  background: isSelected ? '#fff7f9' : '#fff',
                  transition: 'border-color .12s, background .12s',
                  overflow: 'hidden',
                }}
              >
                {/* ── Main row (always visible) ─────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.65rem .85rem' }}>
                  {/* Checkbox */}
                  <span onClick={e => { e.stopPropagation(); toggleSelect(p.id); }} style={{ flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ accentColor: '#9d174d', width: 14, height: 14, cursor: 'pointer' }}
                    />
                  </span>

                  {/* Thumbnail — clicking it toggles expand */}
                  <div onClick={() => toggleExpand(p.id)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #f3f4f6' }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🥻</div>
                    )}
                  </div>

                  {/* Name + tags */}
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggleExpand(p.id)} >
                    <div style={{ fontWeight: 600, fontSize: '.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{p.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.2rem', alignItems: 'center' }}>
                      {p.gender && (
                        <span style={{ fontSize: '.65rem', background: '#fdf2f8', color: '#9d174d', borderRadius: '2rem', padding: '0 .45rem', fontWeight: 600 }}>
                          {GENDER_DISPLAY[p.gender] ?? p.gender}
                        </span>
                      )}
                      {p.category && (
                        <span style={{ fontSize: '.65rem', background: '#f3f4f6', color: '#6b7280', borderRadius: '2rem', padding: '0 .45rem' }}>
                          {p.category}
                        </span>
                      )}
                      {p.badge && (
                        <span style={{ fontSize: '.65rem', background: '#fef3c7', color: '#92400e', borderRadius: '2rem', padding: '0 .45rem', fontWeight: 600 }}>
                          {p.badge}
                        </span>
                      )}
                      {colours.length > 0 && (
                        <span style={{ fontSize: '.65rem', color: '#9ca3af' }}>
                          {colours.length} colour{colours.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Quick-edit fields (always visible) ────────── */}
                  <div
                    style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <InlineField
                      label="Price"
                      value={p.price}
                      prefix="$"
                      type="number"
                      placeholder="0.00"
                      onSave={v => saveProductField(p.id, 'price', v)}
                    />
                    <InlineField
                      label="Badge"
                      value={p.badge}
                      placeholder="New / Sale…"
                      onSave={v => saveProductField(p.id, 'badge', v)}
                    />
                    <InlineField
                      label="Cost ₹"
                      value={p.cost_inr}
                      prefix="₹"
                      type="number"
                      placeholder="—"
                      onSave={v => saveProductField(p.id, 'cost_inr', v)}
                    />
                    <InlineField
                      label="Landed A$"
                      value={p.landed_cost_aud}
                      prefix="$"
                      type="number"
                      placeholder="—"
                      onSave={v => saveProductField(p.id, 'landed_cost_aud', v)}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', alignItems: 'flex-end' }}>
                      <span style={{
                        fontSize: '.65rem', fontWeight: 700,
                        background: stockBadge.bg, color: stockBadge.color,
                        borderRadius: '2rem', padding: '.18rem .55rem',
                        whiteSpace: 'nowrap',
                      }}>
                        {stockBadge.label}
                      </span>
                      <ProfitChip price={p.price} landedCost={p.landed_cost_aud} />
                    </div>
                  </div>

                  {/* Chevron */}
                  <div onClick={() => toggleExpand(p.id)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
                      style={{ transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* ── Expanded detail ──────────────────────────── */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f9fafb', padding: '.85rem 1rem', background: '#fafafa' }}>
                    {/* Action row */}
                    <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.85rem', flexWrap: 'wrap' }}>
                      <a
                        href={`/admin/products/${p.id}/edit`}
                        style={{
                          padding: '.3rem .75rem', borderRadius: '6px', fontSize: '.75rem',
                          background: '#f3f4f6', color: '#374151', fontWeight: 600,
                          textDecoration: 'none', border: '1px solid #e5e7eb',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        ✏️ Full edit
                      </a>
                      <button
                        onClick={e => { e.stopPropagation(); deleteProduct(p.id, p.name); }}
                        style={{
                          padding: '.3rem .75rem', borderRadius: '6px', fontSize: '.75rem',
                          background: '#fee2e2', color: '#b91c1c', fontWeight: 600,
                          border: '1px solid #fca5a5', cursor: 'pointer',
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>

                    {/* Variants by colour */}
                    {colours.map(colour => {
                      const colourVariants = sortVariants(p.variants.filter(v => v.colour === colour));
                      const colourImages   = (imageMap[p.id] ?? []).filter(i => i.colour === colour);

                      return (
                        <div key={colour} style={{ marginBottom: '1rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '.78rem', color: '#9d174d', marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {colour}
                          </div>

                          {colourImages.length > 0 && (
                            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
                              {colourImages.map(img => (
                                <div key={img.id} style={{ position: 'relative' }}>
                                  <img src={img.url} alt={colour}
                                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #f3f4f6' }}
                                  />
                                  <button
                                    onClick={e => { e.stopPropagation(); deleteImage(p.id, img.id); }}
                                    style={{
                                      position: 'absolute', top: -6, right: -6,
                                      width: 18, height: 18, borderRadius: '50%',
                                      background: '#b91c1c', color: 'white',
                                      fontSize: '.6rem', fontWeight: 700,
                                      border: '1.5px solid white', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                    title="Remove image"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <label
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', cursor: 'pointer', fontSize: '.72rem', color: '#6b7280', marginBottom: '.5rem' }}
                          >
                            <input
                              type="file" multiple accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) uploadFiles(p.id, colour, f); e.target.value = ''; }}
                            />
                            📎 Add images
                          </label>

                          {colourVariants.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.5rem' }}>
                              {colourVariants.map(v => (
                                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                                  <span style={{ fontSize: '.72rem', color: '#374151', minWidth: 28, textAlign: 'right' }}>{v.size}</span>
                                  <input
                                    type="number" min={0}
                                    value={variantDrafts[v.id] ?? v.stock_count}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setVariantDrafts(d => ({ ...d, [v.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                    onBlur={() => {
                                      const qty = variantDrafts[v.id] ?? v.stock_count;
                                      if (qty !== v.stock_count) saveVariantStock(v.id, p.id, v.size, v.colour, qty);
                                    }}
                                    style={{
                                      width: 52, padding: '.22rem .35rem', fontSize: '.78rem',
                                      border: '1.5px solid #e5e7eb', borderRadius: 5,
                                      textAlign: 'center',
                                    }}
                                  />
                                  {saving[v.id] && <span style={{ fontSize: '.65rem', color: '#9ca3af' }}>…</span>}
                                  <button
                                    onClick={e => { e.stopPropagation(); deleteVariant(v.id); }}
                                    title="Remove size"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '.75rem', padding: '0 .1rem' }}
                                  >×</button>
                                </div>
                              ))}
                            </div>
                          )}

                          <AddSizeForm productId={p.id} colour={colour} onAdd={addVariant} />
                        </div>
                      );
                    })}

                    <AddColourForm productId={p.id} onAdd={addColourGroup} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-forms ────────────────────────────────────────────────────

function AddSizeForm({ productId, colour, onAdd }: { productId: string; colour: string; onAdd: (pid: string, size: string, colour: string) => void }) {
  const [size, setSize] = useState('');
  return (
    <form
      onSubmit={e => { e.preventDefault(); e.stopPropagation(); if (size.trim()) { onAdd(productId, size, colour); setSize(''); } }}
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', gap: '.3rem', alignItems: 'center', marginTop: '.25rem' }}
    >
      <input
        value={size}
        onChange={e => setSize(e.target.value)}
        placeholder="Size…"
        style={{
          width: 70, padding: '.22rem .4rem', fontSize: '.75rem',
          border: '1.5px solid #e5e7eb', borderRadius: 5,
        }}
      />
      <button type="submit" style={{ padding: '.22rem .55rem', borderRadius: 5, background: '#f3f4f6', color: '#374151', fontSize: '.72rem', fontWeight: 600, border: '1px solid #e5e7eb', cursor: 'pointer' }}>
        + Size
      </button>
    </form>
  );
}

function AddColourForm({ productId, onAdd }: { productId: string; onAdd: (pid: string, colour: string) => void }) {
  const [colour, setColour] = useState('');
  return (
    <form
      onSubmit={e => { e.preventDefault(); e.stopPropagation(); if (colour.trim()) { onAdd(productId, colour); setColour(''); } }}
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', gap: '.3rem', alignItems: 'center', marginTop: '.5rem', borderTop: '1px dashed #f3f4f6', paddingTop: '.5rem' }}
    >
      <input
        value={colour}
        onChange={e => setColour(e.target.value)}
        placeholder="New colour…"
        style={{
          width: 120, padding: '.22rem .4rem', fontSize: '.75rem',
          border: '1.5px solid #e5e7eb', borderRadius: 5,
        }}
      />
      <button type="submit" style={{ padding: '.22rem .55rem', borderRadius: 5, background: '#fdf2f8', color: '#9d174d', fontSize: '.72rem', fontWeight: 600, border: '1px solid #fce7f3', cursor: 'pointer' }}>
        + Colour group
      </button>
    </form>
  );
}
