'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

type ProductImage = { id: string; colour: string; url: string; sort_order: number };
type Variant      = { id: string; size: string; colour: string; stock_count: number; image_url?: string | null };
type Product      = {
  id: string; name: string; slug: string; price: number;
  category: string; gender?: string; badge?: string;
  in_stock?: boolean; image?: string;
  variants: Variant[];
};

// Anchor sizes — internal bookkeeping only, never shown to admin or shoppers
const ANCHOR_SIZES = new Set(['__colour__', 'TBA']);

const SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];
function sortVariants(vs: Variant[]) {
  const real    = vs.filter(v => !ANCHOR_SIZES.has(v.size));
  const letter  = real.filter(v => SIZE_ORDER.includes(v.size)).sort((a,b) => SIZE_ORDER.indexOf(a.size)-SIZE_ORDER.indexOf(b.size));
  const numeric = real.filter(v => /^\d/.test(v.size)).sort((a,b) => parseFloat(a.size)-parseFloat(b.size));
  const other   = real.filter(v => !SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

function totalStock(variants: Variant[]) {
  return variants.filter(v => !ANCHOR_SIZES.has(v.size)).reduce((s,v) => s + (v.stock_count ?? 0), 0);
}

function uniqueColours(variants: Variant[], images: ProductImage[]): string[] {
  const seen: Record<string,true> = {};
  const out: string[] = [];
  const all = [
    ...variants.map(v => v.colour),
    ...images.map(i => i.colour),
  ];
  for (const c of all) {
    if (c && typeof c === 'string' && c.trim() && !seen[c]) { seen[c] = true; out.push(c); }
  }
  return out.sort();
}

export default function AdminProductsPage() {
  const [products,     setProducts]     = useState<Product[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [saving,       setSaving]       = useState<Record<string,boolean>>({});
  const [variantDrafts,setVariantDrafts]= useState<Record<string,number>>({});
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  // images keyed by product id
  const [imageMap,     setImageMap]     = useState<Record<string, ProductImage[]>>({});

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

  // Load images for a product when its panel is first opened
  const loadImages = useCallback(async (productId: string) => {
    if (imageMap[productId]) return; // already loaded
    try {
      const res = await fetch(`/api/product-images/${productId}`, { credentials: 'include' });
      const data = await res.json();
      setImageMap(m => ({ ...m, [productId]: Array.isArray(data) ? data : [] }));
    } catch {
      setImageMap(m => ({ ...m, [productId]: [] }));
    }
  }, [imageMap]);

  function toggleExpand(productId: string) {
    if (expandedId === productId) {
      setExpandedId(null);
    } else {
      setExpandedId(productId);
      loadImages(productId);
    }
  }

  const filtered = products
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aS = totalStock(a.variants);
      const bS = totalStock(b.variants);
      if (aS === 0 && bS > 0) return 1;
      if (bS === 0 && aS > 0) return -1;
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
    load();
  }

  async function deleteImage(productId: string, imageId: string) {
    if (!confirm('Remove this image?')) return;
    await fetch(`/api/product-images/${productId}?id=${imageId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
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
      const res = await fetch('/api/admin/scan-upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.image) newImgs.push(d.image as ProductImage);
      }
    }
    if (newImgs.length) {
      setImageMap(m => ({ ...m, [productId]: [...(m[productId] ?? []), ...newImgs] }));
    }
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
          <p style={{ fontSize: '.78rem', color: '#9ca3af', margin: 0 }}>Manage listings, stock &amp; images</p>
        </div>
        <a
          href="/admin/products/new"
          style={{ background: '#9d174d', color: 'white', borderRadius: '.5rem', padding: '.5rem 1.1rem', textDecoration: 'none', fontSize: '.82rem', fontWeight: 700 }}
        >+ New product</a>
      </div>

      {/* Search */}
      <input
        type="search" placeholder="Search products or category…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '.55rem .85rem', borderRadius: '.5rem', border: '1px solid #e5e7eb', fontSize: '.875rem', marginBottom: '1rem', outline: 'none', boxSizing: 'border-box' }}
      />

      {/* Summary */}
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
          <span>⚠ {fetchError}</span>
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
          const total    = totalStock(p.variants);
          const low      = total > 0 && total <= 5;
          const isOpen   = expandedId === p.id;
          const images   = imageMap[p.id] ?? [];
          const colours  = uniqueColours(p.variants, images);

          return (
            <div key={p.id} style={{
              background: 'white', borderRadius: '.7rem',
              border: `1px solid ${total === 0 ? '#fecaca' : '#fce7f3'}`,
              boxShadow: '0 1px 3px rgba(0,0,0,.04)', overflow: 'hidden',
              opacity: total === 0 ? .88 : 1,
            }}>

              {/* ─── Product row ─── */}
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
                  color:      total === 0 ? '#991b1b' : low ? '#854d0e' : '#166534',
                }}>
                  {total === 0 ? '⚠ Out of stock' : low ? `⚠ ${total} left` : `${total} units`}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '.35rem', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    onClick={() => toggleExpand(p.id)}
                    style={{
                      fontSize: '.75rem', fontWeight: 600,
                      background: isOpen ? '#9d174d' : '#fdf2f8',
                      color: isOpen ? 'white' : '#9d174d',
                      border: 'none', borderRadius: '.4rem', padding: '.32rem .65rem', cursor: 'pointer',
                    }}
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

              {/* ─── Expanded inline panel ─── */}
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
  product:         Product;
  images:          ProductImage[];
  colours:         string[];
  variantDrafts:   Record<string,number>;
  setVariantDrafts:React.Dispatch<React.SetStateAction<Record<string,number>>>;
  saving:          Record<string,boolean>;
  onSave:          (vid: string, pid: string, size: string, colour: string, qty: number) => Promise<void>;
  onAddVariant:    (pid: string, size: string, colour: string) => Promise<void>;
  onDeleteVariant: (vid: string) => Promise<void>;
  onAddColour:     (name: string) => Promise<void>;
  onDeleteImage:   (imgId: string) => Promise<void>;
  onUploadFiles:   (colour: string, files: File[]) => Promise<void>;
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
  const noColourVariants = sortVariants(product.variants.filter(v => !v.colour));

  return (
    <div style={{ borderTop: '1px solid #fce7f3', background: '#fffbfd', padding: '1rem' }}>

      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#9d174d', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Images &amp; Stock
        </span>
        <button
          onClick={() => setShowColourForm(v => !v)}
          style={{
            fontSize: '.75rem', fontWeight: 700, background: '#7c3aed', color: 'white',
            border: 'none', borderRadius: '.4rem', padding: '.3rem .7rem', cursor: 'pointer',
          }}
        >+ Add colour</button>
      </div>

      {/* Add colour form */}
      {showColourForm && (
        <div style={{
          display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap',
          background: 'white', border: '1px solid #ede9fe', borderRadius: '.55rem',
          padding: '.6rem .75rem', marginBottom: '.85rem',
        }}>
          <span style={{ fontSize: '.78rem', fontWeight: 600, color: '#7c3aed', whiteSpace: 'nowrap' }}>Colour name:</span>
          <input
            value={newColourName}
            onChange={e => setNewColourName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitColour(); } }}
            placeholder="e.g. Maroon, Royal Blue…"
            autoFocus
            style={{
              flex: 1, minWidth: '140px', padding: '.35rem .5rem',
              border: '1px solid #e5e7eb', borderRadius: '.4rem',
              fontSize: '.8rem', outline: 'none',
            }}
          />
          <button
            disabled={!newColourName.trim() || addingColour}
            onClick={submitColour}
            style={{
              padding: '.35rem .75rem', background: '#7c3aed', color: 'white',
              border: 'none', borderRadius: '.4rem', fontSize: '.78rem',
              fontWeight: 700, cursor: 'pointer',
              opacity: newColourName.trim() && !addingColour ? 1 : .5,
            }}
          >{addingColour ? 'Saving…' : 'Add'}</button>
          <button
            onClick={() => { setShowColourForm(false); setNewColourName(''); }}
            style={{
              padding: '.35rem .55rem', background: '#f9fafb', color: '#6b7280',
              border: '1px solid #e5e7eb', borderRadius: '.4rem',
              fontSize: '.78rem', cursor: 'pointer',
            }}
          >Cancel</button>
        </div>
      )}

      {/* Empty state */}
      {colours.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.35rem' }}>🎨</div>
          <p style={{ fontWeight: 600, color: '#6b7280', fontSize: '.82rem', marginBottom: '.25rem' }}>No colour variants yet</p>
          <p style={{ fontSize: '.75rem' }}>Click &ldquo;+ Add colour&rdquo; above to get started.</p>
        </div>
      )}

      {/* Colour groups */}
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

      {/* Variants with no colour */}
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
  colour, variants, images, productId: _pid,
  variantDrafts, setVariantDrafts, saving,
  onSave, onAddVariant, onDeleteVariant, onDeleteImage, onUploadFiles,
}: {
  colour:          string;
  variants:        Variant[];
  images:          ProductImage[];
  productId:       string;
  variantDrafts:   Record<string,number>;
  setVariantDrafts:React.Dispatch<React.SetStateAction<Record<string,number>>>;
  saving:          Record<string,boolean>;
  onSave:          (vid: string, size: string, qty: number) => Promise<void>;
  onAddVariant:    (size: string) => Promise<void>;
  onDeleteVariant: (vid: string) => Promise<void>;
  onDeleteImage:   (imgId: string) => Promise<void>;
  onUploadFiles:   (files: File[]) => Promise<void>;
}) {
  const [uploading,    setUploading]    = useState(false);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const [showSizeForm, setShowSizeForm] = useState(false);
  const [newSize,      setNewSize]      = useState('');
  const [newQty,       setNewQty]       = useState(0);
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

  const totalStock = variants.reduce((s,v) => s + (variantDrafts[v.id] ?? v.stock_count), 0);

  return (
    <div style={{
      background: 'white', border: '1px solid #fce7f3',
      borderRadius: '.6rem', marginBottom: '.75rem',
      overflow: 'hidden',
    }}>
      {/* Group header */}
      <div style={{
        background: 'linear-gradient(to right,#fdf2f8,#fdf8ff)',
        borderBottom: '1px solid #fce7f3',
        padding: '.45rem .75rem',
        display: 'flex', alignItems: 'center', gap: '.4rem',
      }}>
        <span style={{ fontSize: '.95rem' }}>🎨</span>
        <span style={{ fontWeight: 700, fontSize: '.82rem', color: '#9d174d', flex: 1, textTransform: 'capitalize' }}>{colour}</span>
        <span style={{ fontSize: '.68rem', color: '#9ca3af' }}>
          {images.length} img{images.length !== 1 ? 's' : ''}
          {variants.length > 0 && ` · ${variants.length} size${variants.length !== 1 ? 's' : ''} · ${totalStock} units`}
        </span>
      </div>

      <div style={{
        padding: '.65rem .75rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(160px,1fr) minmax(160px,1.2fr)',
        gap: '1rem',
      }}>

        {/* ── Left: Images ── */}
        <div>
          <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Photos</div>

          {/* Thumbnail strip */}
          {images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginBottom: '.5rem' }}>
              {images.map((img, idx) => (
                <div key={img.id} style={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url} alt={`${colour} ${idx+1}`} width={58} height={58}
                    style={{ width: 58, height: 58, objectFit: 'cover', borderRadius: '.35rem', border: '1px solid #fce7f3', display: 'block' }}
                  />
                  {idx === 0 && (
                    <span style={{
                      position: 'absolute', bottom: 2, left: 2,
                      fontSize: '.48rem', background: '#9d174d', color: 'white',
                      borderRadius: '.2rem', padding: '.05rem .25rem', fontWeight: 700, lineHeight: 1.4,
                    }}>MAIN</span>
                  )}
                  <button
                    onClick={() => onDeleteImage(img.id)}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 16, height: 16, background: 'rgba(0,0,0,.55)',
                      color: 'white', border: 'none', borderRadius: '50%',
                      fontSize: '.55rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? '#9d174d' : '#fce7f3'}`,
              borderRadius: '.45rem', padding: '.55rem .5rem',
              textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
              background: isDragOver ? '#fdf2f8' : '#fffbfd',
              transition: 'border-color .15s, background .15s',
            }}
          >
            {uploading ? (
              <span style={{ fontSize: '.72rem', color: '#9d174d', fontWeight: 600 }}>Uploading… ⏳</span>
            ) : (
              <>
                <div style={{ fontSize: '1.1rem', marginBottom: '.1rem' }}>📤</div>
                <div style={{ fontSize: '.7rem', color: '#6b7280', fontWeight: 600 }}>
                  {images.length ? 'Add more' : 'Upload images'}
                </div>
                <div style={{ fontSize: '.62rem', color: '#9ca3af' }}>Click or drag · JPG PNG WEBP</div>
              </>
            )}
          </div>
          <input
            ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
          />
        </div>

        {/* ── Right: Sizes & stock ── */}
        <div>
          <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Sizes &amp; Stock</div>

          {variants.length === 0 ? (
            <p style={{ fontSize: '.73rem', color: '#9ca3af', marginBottom: '.4rem' }}>No sizes yet.</p>
          ) : (
            <div style={{ marginBottom: '.4rem' }}>
              <VariantChips
                variants={variants}
                drafts={variantDrafts}
                saving={saving}
                setDrafts={setVariantDrafts}
                onSave={onSave}
                onDelete={onDeleteVariant}
              />
            </div>
          )}

          {!showSizeForm ? (
            <button
              onClick={() => setShowSizeForm(true)}
              style={{
                fontSize: '.7rem', color: '#9d174d', background: '#fdf2f8',
                border: '1px dashed #fce7f3', borderRadius: '.35rem',
                padding: '.25rem .55rem', cursor: 'pointer', fontWeight: 600,
              }}
            >+ Add size</button>
          ) : (
            <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="S, M, 38…" value={newSize}
                onChange={e => setNewSize(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSize.trim()) {
                    e.preventDefault();
                    setAddingSize(true);
                    onAddVariant(newSize.trim()).then(() => { setNewSize(''); setNewQty(0); setShowSizeForm(false); setAddingSize(false); });
                  }
                }}
                autoFocus
                style={{ flex: '1 1 55px', minWidth: '50px', padding: '.28rem .4rem', border: '1px solid #e5e7eb', borderRadius: '.35rem', fontSize: '.75rem', outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '.2rem' }}>
                <label style={{ fontSize: '.65rem', color: '#9ca3af' }}>Qty:</label>
                <input
                  type="number" min={0} value={newQty}
                  onChange={e => setNewQty(parseInt(e.target.value) || 0)}
                  style={{ width: '2.8rem', padding: '.28rem', border: '1px solid #e5e7eb', borderRadius: '.35rem', fontSize: '.75rem', textAlign: 'center', outline: 'none' }}
                />
              </div>
              <button
                disabled={addingSize || !newSize.trim()}
                onClick={async () => {
                  setAddingSize(true);
                  await onAddVariant(newSize.trim());
                  setNewSize(''); setNewQty(0); setShowSizeForm(false); setAddingSize(false);
                }}
                style={{ padding: '.28rem .5rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.35rem', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', opacity: addingSize || !newSize.trim() ? .6 : 1 }}
              >{addingSize ? '…' : 'Add'}</button>
              <button
                onClick={() => { setShowSizeForm(false); setNewSize(''); setNewQty(0); }}
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
          <div key={v.id} style={{
            display: 'flex', alignItems: 'center', gap: '.3rem',
            background: qty === 0 ? '#fff5f5' : 'white',
            border: `1px solid ${qty === 0 ? '#fecaca' : qty <= 3 ? '#fef08a' : '#e5e7eb'}`,
            borderRadius: '.4rem', padding: '.25rem .4rem',
          }}>
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
