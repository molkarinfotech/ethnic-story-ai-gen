'use client';
import { useState, useEffect, useCallback, useRef, use } from 'react';

type ProductImage = { id: string; colour: string; url: string; sort_order: number };
type Variant      = { id: string; size: string; colour: string; stock_count: number };
type Product      = {
  id: string; name: string; category: string; price: number;
  gender?: string; image?: string;
  variants: Variant[];
};

const SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];
function sortVariants(vs: Variant[]) {
  const letter  = vs.filter(v => SIZE_ORDER.includes(v.size)).sort((a,b) => SIZE_ORDER.indexOf(a.size)-SIZE_ORDER.indexOf(b.size));
  const numeric = vs.filter(v => /^\d/.test(v.size)).sort((a,b) => parseFloat(a.size)-parseFloat(b.size));
  const other   = vs.filter(v => !SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

function uniqueSorted(arr: string[]): string[] {
  const seen: Record<string,true> = {};
  const out: string[] = [];
  for (const s of arr) { if (s && !seen[s]) { seen[s] = true; out.push(s); } }
  return out.sort();
}

/* ─────────────────────────────────────────────────────────── */
export default function InventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);

  const [product,        setProduct]        = useState<Product | null>(null);
  const [images,         setImages]         = useState<ProductImage[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState<Record<string,boolean>>({});
  const [drafts,         setDrafts]         = useState<Record<string,number>>({});
  // Colours that exist only in local state — no DB row yet.
  // They become "real" as soon as the user adds a size or uploads an image.
  const [pendingColours, setPendingColours] = useState<string[]>([]);

  const [showAddColour, setShowAddColour] = useState(false);
  const [newColourName, setNewColourName] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [prodRes, imgRes] = await Promise.all([
      fetch(`/api/admin/products/${productId}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/product-images/${productId}`, { credentials: 'include' }).then(r => r.json()),
    ]);
    if (!prodRes.error) {
      setProduct(prodRes);
      // Promote any pending colours that now exist in real data
      const realColours = new Set([
        ...(prodRes.variants ?? []).map((v: Variant) => v.colour).filter(Boolean),
        ...(Array.isArray(imgRes) ? imgRes : []).map((i: ProductImage) => i.colour).filter(Boolean),
      ]);
      setPendingColours(prev => prev.filter(c => !realColours.has(c)));
    }
    setImages(Array.isArray(imgRes) ? imgRes : []);
    setLoading(false);
  }, [productId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Derived data ── */
  // Union of DB-backed colours + pending (local-only) colours
  const dbColours = product
    ? uniqueSorted([
        ...product.variants.map(v => v.colour).filter(Boolean) as string[],
        ...images.map(i => i.colour).filter(Boolean) as string[],
      ])
    : [];
  const colours = uniqueSorted([...dbColours, ...pendingColours]);

  function imagesByColour(c: string) {
    return images.filter(i => i.colour === c).sort((a,b) => a.sort_order - b.sort_order);
  }
  function variantsByColour(c: string) {
    return sortVariants(product?.variants.filter(v => v.colour === c) ?? []);
  }
  const noColourVariants = sortVariants(product?.variants.filter(v => !v.colour) ?? []);
  const totalStock = product?.variants.reduce((s,v) => s + v.stock_count, 0) ?? 0;

  /* ── Stock ── */
  async function saveStock(variantId: string, pid: string, size: string, colour: string, qty: number) {
    setSaving(s => ({ ...s, [variantId]: true }));
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId, product_id: pid, size, colour, stock_count: qty }),
    });
    setProduct(p => !p ? p : { ...p, variants: p.variants.map(v => v.id === variantId ? { ...v, stock_count: qty } : v) });
    setSaving(s => { const n={...s}; delete n[variantId]; return n; });
    setDrafts(d => { const n={...d}; delete n[variantId]; return n; });
  }

  async function deleteVariant(variantId: string) {
    if (!confirm('Remove this size variant?')) return;
    await fetch('/api/admin/stock', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId }),
    });
    setProduct(p => !p ? p : { ...p, variants: p.variants.filter(v => v.id !== variantId) });
  }

  async function addVariant(colour: string, size: string, qty = 0) {
    if (!size.trim()) return;
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, size: size.trim(), colour, stock_count: qty }),
    });
    await loadAll();
  }

  /* ── Images ── */
  async function deleteImage(imageId: string) {
    if (!confirm('Remove this image?')) return;
    await fetch(`/api/product-images/${productId}?id=${imageId}`, { method: 'DELETE', credentials: 'include' });
    setImages(imgs => imgs.filter(i => i.id !== imageId));
  }

  async function uploadFiles(colour: string, files: File[]): Promise<ProductImage[]> {
    const results: ProductImage[] = [];
    const baseOrder = imagesByColour(colour).length;
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('image',      files[i]);
      fd.append('product_id', productId);
      fd.append('colour',     colour || 'Unassigned');
      fd.append('sort_order', String(baseOrder + i));
      const res = await fetch('/api/admin/scan-upload', { method: 'POST', credentials: 'include', body: fd });
      if (res.ok) {
        const d = await res.json();
        if (d.image) results.push(d.image);
      }
    }
    // Once an image is uploaded the colour is real — remove from pending
    setPendingColours(prev => prev.filter(c => c !== colour));
    return results;
  }

  /* ── Add new colour group (local-only — no DB write) ── */
  function addColourGroup() {
    const name = newColourName.trim();
    if (!name) return;
    // Normalise to Title Case to match what the API will store
    const normalised = name
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    if (!colours.includes(normalised)) {
      setPendingColours(prev => [...prev, normalised]);
    }
    setNewColourName('');
    setShowAddColour(false);
  }

  /* ─── Render ─── */
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '.875rem' }}>Loading…</div>;
  }

  if (!product) {
    return (
      <div style={{ padding: '2rem' }}>
        <a href="/admin/products" style={{ color: '#9d174d', textDecoration: 'none', fontSize: '.875rem' }}>← Back to Products</a>
        <p style={{ marginTop: '1rem', color: '#ef4444' }}>Product not found.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* ── Breadcrumb + header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem', fontSize: '.8rem' }}>
        <a href="/admin/products" style={{ color: '#9d174d', textDecoration: 'none', fontWeight: 500 }}>Products</a>
        <span style={{ color: '#d1d5db' }}>›</span>
        <span style={{ color: '#6b7280' }}>{product.name}</span>
        <span style={{ color: '#d1d5db' }}>›</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>Images & Inventory</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '.2rem' }}>{product.name}</h1>
          <div style={{ fontSize: '.78rem', color: '#6b7280', display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{product.category}</span>
            {product.gender && <span>· {product.gender}</span>}
            <span>· A${product.price}</span>
            <span style={{
              fontSize: '.7rem', fontWeight: 700, borderRadius: '2rem', padding: '.15rem .5rem',
              background: totalStock === 0 ? '#fee2e2' : totalStock <= 5 ? '#fef9c3' : '#dcfce7',
              color: totalStock === 0 ? '#991b1b' : totalStock <= 5 ? '#854d0e' : '#166534',
            }}>
              {totalStock === 0 ? '⚠ Out of stock' : `${totalStock} units total`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <a href={`/admin/products/${productId}/edit`} style={{ fontSize: '.8rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none', background: '#fdf2f8', border: '1px solid #fce7f3', borderRadius: '.4rem', padding: '.35rem .75rem' }}>✏️ Edit details</a>
          <button
            onClick={() => setShowAddColour(v => !v)}
            style={{ fontSize: '.8rem', color: 'white', fontWeight: 600, background: '#7c3aed', border: 'none', borderRadius: '.4rem', padding: '.35rem .75rem', cursor: 'pointer' }}
          >
            + Add colour
          </button>
        </div>
      </div>

      {/* ── Add colour form ── */}
      {showAddColour && (
        <div style={{ background: 'white', border: '1px solid #ede9fe', borderRadius: '.65rem', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#7c3aed' }}>New colour:</span>
          <input
            value={newColourName}
            onChange={e => setNewColourName(e.target.value)}
            placeholder="e.g. Royal Blue, Maroon, Off-white"
            onKeyDown={e => e.key === 'Enter' && addColourGroup()}
            style={{ flex: 1, minWidth: '160px', padding: '.4rem .6rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', outline: 'none' }}
            autoFocus
          />
          <button onClick={addColourGroup} disabled={!newColourName.trim()}
            style={{ padding: '.4rem .85rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '.4rem', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', opacity: newColourName.trim() ? 1 : .5 }}
          >Add</button>
          <button onClick={() => { setShowAddColour(false); setNewColourName(''); }}
            style={{ padding: '.4rem .65rem', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', cursor: 'pointer' }}
          >Cancel</button>
        </div>
      )}

      {/* ── Helper tip shown only when there are pending (unsaved) colours ── */}
      {pendingColours.length > 0 && (
        <div style={{ fontSize: '.75rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: '.5rem', padding: '.5rem .85rem', marginBottom: '.85rem' }}>
          💡 <strong>{pendingColours.join(', ')}</strong> — colour added locally.
          Upload an image or add a size below to save it permanently.
        </div>
      )}

      {/* ── Colour sections ── */}
      {colours.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af', background: 'white', borderRadius: '.7rem', border: '1px dashed #fce7f3' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🎨</div>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: '.25rem' }}>No colours yet</p>
          <p style={{ fontSize: '.8rem' }}>Click &quot;+ Add colour&quot; above to start building your product&apos;s colour variants.</p>
        </div>
      )}

      {colours.map(colour => (
        <ColourSection
          key={colour}
          colour={colour}
          productId={productId}
          images={imagesByColour(colour)}
          variants={variantsByColour(colour)}
          drafts={drafts}
          saving={saving}
          isPending={pendingColours.includes(colour)}
          setDrafts={setDrafts}
          onSaveStock={(vid, size, qty) => saveStock(vid, productId, size, colour, qty)}
          onDeleteVariant={deleteVariant}
          onDeleteImage={deleteImage}
          onAddVariant={(size, qty) => addVariant(colour, size, qty)}
          onUploadFiles={(files) => uploadFiles(colour, files).then(newImgs => setImages(imgs => [...imgs, ...newImgs]))}
        />
      ))}

      {/* Variants with no colour */}
      {noColourVariants.length > 0 && (
        <section style={{ background: 'white', borderRadius: '.7rem', border: '1px solid #fce7f3', padding: '1.1rem', marginTop: '1rem' }}>
          <h2 style={{ fontSize: '.85rem', fontWeight: 700, color: '#374151', marginBottom: '.75rem' }}>Size variants (no colour)</h2>
          <VariantGrid
            variants={noColourVariants} drafts={drafts} saving={saving} setDrafts={setDrafts}
            onSave={(vid, size, qty) => saveStock(vid, productId, size, '', qty)}
            onDelete={deleteVariant}
          />
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
function ColourSection({
  colour, productId, images, variants, drafts, saving, setDrafts, isPending,
  onSaveStock, onDeleteVariant, onDeleteImage, onAddVariant, onUploadFiles,
}: {
  colour: string;
  productId: string;
  images: ProductImage[];
  variants: Variant[];
  drafts: Record<string, number>;
  saving: Record<string, boolean>;
  isPending: boolean;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSaveStock: (vid: string, size: string, qty: number) => Promise<void>;
  onDeleteVariant: (vid: string) => Promise<void>;
  onDeleteImage: (iid: string) => Promise<void>;
  onAddVariant: (size: string, qty: number) => Promise<void>;
  onUploadFiles: (files: File[]) => Promise<void>;
}) {
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [isDragOver,   setIsDragOver]   = useState(false);
  const [newSize,      setNewSize]      = useState('');
  const [newQty,       setNewQty]       = useState(0);
  const [addingSize,   setAddingSize]   = useState(false);
  const [showSizeForm, setShowSizeForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    setUploading(true); setUploadError('');
    try {
      await onUploadFiles(arr);
    } catch {
      setUploadError('Upload failed — please try again.');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  const totalVariantStock = variants.reduce((s,v) => s + (drafts[v.id] ?? v.stock_count), 0);

  return (
    <section style={{
      background: 'white', borderRadius: '.75rem',
      border: `1px solid ${isPending ? '#ede9fe' : '#fce7f3'}`,
      overflow: 'hidden', marginBottom: '1.1rem',
      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
    }}>
      {/* Section header */}
      <div style={{
        background: isPending
          ? 'linear-gradient(to right, #f5f3ff, #fdf8ff)'
          : 'linear-gradient(to right, #fdf2f8, #fdf8ff)',
        padding: '.65rem 1rem', borderBottom: `1px solid ${isPending ? '#ede9fe' : '#fce7f3'}`,
        display: 'flex', alignItems: 'center', gap: '.5rem',
      }}>
        <span style={{ fontSize: '1.05rem' }}>🎨</span>
        <span style={{ fontWeight: 700, fontSize: '.92rem', color: isPending ? '#7c3aed' : '#9d174d', textTransform: 'capitalize', flex: 1 }}>
          {colour}
          {isPending && <span style={{ marginLeft: '.5rem', fontSize: '.65rem', fontWeight: 600, background: '#ede9fe', color: '#7c3aed', borderRadius: '2rem', padding: '.1rem .45rem', verticalAlign: 'middle' }}>unsaved</span>}
        </span>
        <span style={{ fontSize: '.7rem', color: '#9ca3af' }}>
          {images.length} image{images.length !== 1 ? 's' : ''}
          {variants.length > 0 && ` · ${variants.length} size${variants.length !== 1 ? 's' : ''} · ${totalVariantStock} units`}
        </span>
      </div>

      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* ── LEFT: Images ── */}
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>Photos</div>

          {images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem', marginBottom: '.75rem' }}>
              {images.map((img, idx) => (
                <div key={img.id} style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url} alt={`${colour} ${idx + 1}`}
                    width={72} height={72}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '.45rem', border: '1px solid #fce7f3' }}
                  />
                  {idx === 0 && (
                    <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: '.52rem', background: '#9d174d', color: 'white', borderRadius: '.25rem', padding: '.05rem .25rem', fontWeight: 700, lineHeight: 1.4 }}>MAIN</span>
                  )}
                  <button
                    onClick={() => onDeleteImage(img.id)}
                    style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', borderRadius: '50%', fontSize: '.58rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    title="Remove image"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Upload drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? '#9d174d' : '#fce7f3'}`,
              borderRadius: '.6rem',
              padding: '.85rem .75rem',
              textAlign: 'center',
              cursor: uploading ? 'default' : 'pointer',
              background: isDragOver ? '#fdf2f8' : '#fffbfd',
              transition: 'border-color .15s, background .15s',
            }}
          >
            {uploading ? (
              <div style={{ fontSize: '.78rem', color: '#9d174d', fontWeight: 600 }}>Uploading… ⏳</div>
            ) : (
              <>
                <div style={{ fontSize: '1.2rem', marginBottom: '.2rem' }}>📤</div>
                <div style={{ fontSize: '.75rem', color: '#6b7280', fontWeight: 600 }}>Click or drag images here</div>
                <div style={{ fontSize: '.68rem', color: '#9ca3af', marginTop: '.15rem' }}>JPG, PNG, WEBP · multiple OK</div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
          />
          {uploadError && <p style={{ color: '#ef4444', fontSize: '.72rem', marginTop: '.35rem', margin: '.35rem 0 0' }}>{uploadError}</p>}
        </div>

        {/* ── RIGHT: Stock by size ── */}
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>Sizes & Stock</div>

          {variants.length === 0 ? (
            <p style={{ fontSize: '.78rem', color: '#9ca3af', marginBottom: '.6rem' }}>No sizes yet — add one below.</p>
          ) : (
            <VariantGrid
              variants={variants} drafts={drafts} saving={saving} setDrafts={setDrafts}
              onSave={onSaveStock}
              onDelete={onDeleteVariant}
            />
          )}

          {!showSizeForm ? (
            <button
              onClick={() => setShowSizeForm(true)}
              style={{ marginTop: '.6rem', fontSize: '.75rem', color: '#9d174d', background: '#fdf2f8', border: '1px dashed #fce7f3', borderRadius: '.4rem', padding: '.3rem .7rem', cursor: 'pointer', fontWeight: 600 }}
            >+ Add size</button>
          ) : (
            <div style={{ marginTop: '.6rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Size (S, M, 38…)"
                value={newSize}
                onChange={e => setNewSize(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSize.trim()) {
                    setAddingSize(true);
                    onAddVariant(newSize.trim(), newQty).then(() => { setNewSize(''); setNewQty(0); setAddingSize(false); });
                  }
                }}
                style={{ flex: '1 1 70px', minWidth: '65px', padding: '.3rem .45rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.78rem', outline: 'none' }}
                autoFocus
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                <label style={{ fontSize: '.7rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>Qty:</label>
                <input
                  type="number" min={0} value={newQty}
                  onChange={e => setNewQty(parseInt(e.target.value) || 0)}
                  style={{ width: '3rem', padding: '.3rem .3rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}
                />
              </div>
              <button
                disabled={addingSize || !newSize.trim()}
                onClick={async () => { setAddingSize(true); await onAddVariant(newSize.trim(), newQty); setNewSize(''); setNewQty(0); setAddingSize(false); }}
                style={{ padding: '.3rem .6rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.4rem', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', opacity: addingSize || !newSize.trim() ? .6 : 1 }}
              >{addingSize ? '…' : 'Add'}</button>
              <button
                onClick={() => { setShowSizeForm(false); setNewSize(''); setNewQty(0); }}
                style={{ padding: '.3rem .5rem', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.75rem', cursor: 'pointer' }}
              >✕</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
function VariantGrid({
  variants, drafts, saving, setDrafts, onSave, onDelete,
}: {
  variants: Variant[];
  drafts: Record<string, number>;
  saving: Record<string, boolean>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSave: (vid: string, size: string, qty: number) => Promise<void>;
  onDelete: (vid: string) => Promise<void>;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
      {variants.map(v => {
        const qty = drafts[v.id] ?? v.stock_count;
        const isDirty = drafts[v.id] !== undefined && drafts[v.id] !== v.stock_count;
        return (
          <div key={v.id} style={{
            display: 'flex', alignItems: 'center', gap: '.35rem',
            background: qty === 0 ? '#fff5f5' : 'white',
            border: `1px solid ${qty === 0 ? '#fecaca' : qty <= 3 ? '#fef08a' : '#e5e7eb'}`,
            borderRadius: '.45rem', padding: '.28rem .45rem',
          }}>
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#374151', minWidth: '1.8rem' }}>{v.size}</span>
            <input
              type="number" min={0} value={qty}
              onChange={e => setDrafts(d => ({ ...d, [v.id]: parseInt(e.target.value) || 0 }))}
              style={{ width: '3rem', padding: '.18rem .28rem', border: '1px solid #e5e7eb', borderRadius: '.3rem', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}
            />
            {isDirty && (
              <button disabled={saving[v.id]} onClick={() => onSave(v.id, v.size, qty)}
                style={{ fontSize: '.7rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.3rem', padding: '.18rem .35rem', cursor: 'pointer', fontWeight: 700 }}
              >{saving[v.id] ? '…' : '✓'}</button>
            )}
            <button onClick={() => onDelete(v.id)}
              style={{ fontSize: '.62rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '.1rem', lineHeight: 1 }}
              title="Remove size"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
