'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

type ProductImage = { id: string; colour: string; url: string; sort_order: number };
type Variant      = { id: string; size: string; colour: string; stock_count: number };
type Product      = {
  id: string; name: string; category: string; price: number;
  gender?: string; image?: string;
  variants: Variant[];
};

// Placeholder size used to anchor a colour in the DB before any real size is added.
// These rows are kept for colour derivation but hidden from the sizes grid.
const COLOUR_ANCHOR_SIZE = '__colour__';

const SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];
function sortVariants(vs: Variant[]) {
  const real    = vs.filter(v => v.size !== COLOUR_ANCHOR_SIZE);
  const letter  = real.filter(v => SIZE_ORDER.includes(v.size)).sort((a,b) => SIZE_ORDER.indexOf(a.size)-SIZE_ORDER.indexOf(b.size));
  const numeric = real.filter(v => /^\d/.test(v.size)).sort((a,b) => parseFloat(a.size)-parseFloat(b.size));
  const other   = real.filter(v => !SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

function uniqueSorted(arr: (string | undefined | null)[]): string[] {
  const seen: Record<string,true> = {};
  const out: string[] = [];
  for (const s of arr) {
    if (s && typeof s === 'string' && s.trim() && !seen[s]) {
      seen[s] = true;
      out.push(s);
    }
  }
  return out.sort();
}

export default function InventoryPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then(p => setProductId(p.id));
  }, [params]);

  if (!productId) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '.875rem' }}>
        Loading…
      </div>
    );
  }

  return <InventoryInner productId={productId} />;
}

function InventoryInner({ productId }: { productId: string }) {
  const [product,        setProduct]        = useState<Product | null>(null);
  const [images,         setImages]         = useState<ProductImage[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadError,      setLoadError]      = useState<string | null>(null);
  const [saving,         setSaving]         = useState<Record<string,boolean>>({});
  const [drafts,         setDrafts]         = useState<Record<string,number>>({});
  const [showAddColour,  setShowAddColour]  = useState(false);
  const [newColourName,  setNewColourName]  = useState('');
  const [addingColour,   setAddingColour]   = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prodData, imgData] = await Promise.all([
        fetch(`/api/admin/products/${productId}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`/api/product-images/${productId}`, { credentials: 'include' }).then(r => r.json()),
      ]);

      if (prodData?.error) {
        setLoadError(prodData.error);
        setLoading(false);
        return;
      }

      setProduct(prodData as Product);
      setImages(Array.isArray(imgData) ? imgData : []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Colours derived from ALL variants (including anchor rows) + images
  const variantColours = product
    ? uniqueSorted(product.variants.map(v => v.colour))
    : [];
  const imageColours = uniqueSorted(images.map(i => i.colour));
  const colours = uniqueSorted([...variantColours, ...imageColours]);

  function imagesByColour(c: string) {
    return images
      .filter(i => i.colour === c)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  // Real variants only — anchor rows filtered out by sortVariants
  function variantsByColour(c: string) {
    return sortVariants(product?.variants.filter(v => v.colour === c) ?? []);
  }
  const noColourVariants = sortVariants(
    product?.variants.filter(v => !v.colour) ?? []
  );
  const totalStock = product?.variants
    .filter(v => v.size !== COLOUR_ANCHOR_SIZE)
    .reduce((s, v) => s + v.stock_count, 0) ?? 0;

  async function saveStock(variantId: string, pid: string, size: string, colour: string, qty: number) {
    setSaving(s => ({ ...s, [variantId]: true }));
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId, product_id: pid, size, colour, stock_count: qty }),
    });
    setProduct(p =>
      !p ? p : { ...p, variants: p.variants.map(v =>
        v.id === variantId ? { ...v, stock_count: qty } : v
      )}
    );
    setSaving(s => { const n = { ...s }; delete n[variantId]; return n; });
    setDrafts(d => { const n = { ...d }; delete n[variantId]; return n; });
  }

  async function deleteVariant(variantId: string) {
    if (!confirm('Remove this size variant?')) return;
    await fetch('/api/admin/stock', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId }),
    });
    await loadAll();
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

  // Persist colour anchor to DB immediately so colour survives page reloads
  async function addColourGroup() {
    const name = newColourName.trim();
    if (!name) return;
    const normalised = name
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    // Skip if colour already exists
    const existing = new Set([
      ...(product?.variants.map(v => v.colour).filter(Boolean) ?? []),
      ...images.map(i => i.colour).filter(Boolean),
    ]);
    if (existing.has(normalised)) {
      setNewColourName('');
      setShowAddColour(false);
      return;
    }

    setAddingColour(true);
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id:  productId,
        size:        COLOUR_ANCHOR_SIZE,
        colour:      normalised,
        stock_count: 0,
      }),
    });
    setNewColourName('');
    setShowAddColour(false);
    setAddingColour(false);
    // Reload from DB so colour section appears with correct state
    await loadAll();
  }

  async function deleteImage(imageId: string) {
    if (!confirm('Remove this image?')) return;
    await fetch(`/api/product-images/${productId}?id=${imageId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
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
      const res = await fetch('/api/admin/scan-upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.image) results.push(d.image as ProductImage);
      }
    }
    return results;
  }

  /* ─── Render ─── */
  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '.875rem' }}>
        Loading…
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div style={{ padding: '2rem' }}>
        <a href="/admin/products" style={{ color: '#9d174d', textDecoration: 'none', fontSize: '.875rem' }}>
          ← Back to products
        </a>
        <p style={{ marginTop: '1rem', color: '#ef4444' }}>{loadError ?? 'Product not found.'}</p>
        <button
          onClick={loadAll}
          style={{
            marginTop: '.75rem', padding: '.5rem 1rem', background: '#9d174d',
            color: 'white', border: 'none', borderRadius: '.5rem', cursor: 'pointer',
            fontSize: '.875rem', fontWeight: 600,
          }}
        >Retry</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '920px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem', fontSize: '.8rem' }}>
        <a href="/admin/products" style={{ color: '#9d174d', textDecoration: 'none', fontWeight: 500 }}>Products</a>
        <span style={{ color: '#d1d5db' }}>›</span>
        <span style={{ color: '#6b7280' }}>{product.name}</span>
        <span style={{ color: '#d1d5db' }}>›</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>Images &amp; Inventory</span>
      </div>

      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '.2rem' }}>
            {product.name}
          </h1>
          <div style={{ fontSize: '.78rem', color: '#6b7280', display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{product.category}</span>
            {product.gender && <span>· {product.gender}</span>}
            <span>· A${product.price}</span>
            <span style={{
              fontSize: '.7rem', fontWeight: 700, borderRadius: '2rem', padding: '.15rem .5rem',
              background: totalStock === 0 ? '#fee2e2' : totalStock <= 5 ? '#fef9c3' : '#dcfce7',
              color:      totalStock === 0 ? '#991b1b' : totalStock <= 5 ? '#854d0e' : '#166534',
            }}>
              {totalStock === 0 ? '⚠ Out of stock' : `${totalStock} units total`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
          <a
            href={`/admin/products/${productId}/edit`}
            style={{
              fontSize: '.8rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none',
              background: '#fdf2f8', border: '1px solid #fce7f3', borderRadius: '.4rem',
              padding: '.35rem .75rem',
            }}
          >✏️ Edit details</a>
          <button
            onClick={() => setShowAddColour(v => !v)}
            style={{
              fontSize: '.8rem', color: 'white', fontWeight: 600, background: '#7c3aed',
              border: 'none', borderRadius: '.4rem', padding: '.35rem .75rem', cursor: 'pointer',
            }}
          >+ Add colour</button>
        </div>
      </div>

      {/* Add colour inline form */}
      {showAddColour && (
        <div style={{
          background: 'white', border: '1px solid #ede9fe', borderRadius: '.65rem',
          padding: '.85rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#7c3aed', whiteSpace: 'nowrap' }}>New colour:</span>
          <input
            value={newColourName}
            onChange={e => setNewColourName(e.target.value)}
            placeholder="e.g. Royal Blue, Maroon…"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColourGroup(); } }}
            style={{
              flex: 1, minWidth: '160px', padding: '.4rem .6rem',
              border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', outline: 'none',
            }}
            autoFocus
          />
          <button
            onClick={addColourGroup}
            disabled={!newColourName.trim() || addingColour}
            style={{
              padding: '.4rem .85rem', background: '#7c3aed', color: 'white',
              border: 'none', borderRadius: '.4rem', fontSize: '.82rem', fontWeight: 600,
              cursor: 'pointer', opacity: (newColourName.trim() && !addingColour) ? 1 : .5,
            }}
          >{addingColour ? 'Saving…' : 'Add'}</button>
          <button
            onClick={() => { setShowAddColour(false); setNewColourName(''); }}
            style={{
              padding: '.4rem .65rem', background: '#f9fafb', color: '#6b7280',
              border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', cursor: 'pointer',
            }}
          >Cancel</button>
        </div>
      )}

      {/* Empty state */}
      {colours.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af',
          background: 'white', borderRadius: '.7rem', border: '1px dashed #fce7f3',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🎨</div>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: '.25rem' }}>No colour variants yet</p>
          <p style={{ fontSize: '.8rem', marginBottom: '1rem' }}>
            Click &quot;+ Add colour&quot; to create the first colour group,
            then upload images and set stock per size.
          </p>
          <button
            onClick={() => setShowAddColour(true)}
            style={{
              padding: '.5rem 1.25rem', background: '#7c3aed', color: 'white',
              border: 'none', borderRadius: '.5rem', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer',
            }}
          >+ Add first colour</button>
        </div>
      )}

      {/* Colour sections */}
      {colours.map(colour => (
        <ColourSection
          key={colour}
          colour={colour}
          productId={productId}
          images={imagesByColour(colour)}
          variants={variantsByColour(colour)}
          drafts={drafts}
          saving={saving}
          setDrafts={setDrafts}
          onSaveStock={(vid, size, qty) => saveStock(vid, productId, size, colour, qty)}
          onDeleteVariant={deleteVariant}
          onDeleteImage={deleteImage}
          onAddVariant={(size, qty) => addVariant(colour, size, qty)}
          onUploadFiles={(files) =>
            uploadFiles(colour, files).then(newImgs =>
              setImages(imgs => [...imgs, ...newImgs])
            )
          }
        />
      ))}

      {/* Variants without a colour */}
      {noColourVariants.length > 0 && (
        <section style={{
          background: 'white', borderRadius: '.7rem',
          border: '1px solid #fce7f3', padding: '1.1rem', marginTop: '1rem',
        }}>
          <h2 style={{ fontSize: '.85rem', fontWeight: 700, color: '#374151', marginBottom: '.75rem' }}>
            Size variants (no colour assigned)
          </h2>
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

/* ─────────────────────── ColourSection ─────────────────────── */
function ColourSection({
  colour, productId: _productId, images, variants, drafts, saving, setDrafts,
  onSaveStock, onDeleteVariant, onDeleteImage, onAddVariant, onUploadFiles,
}: {
  colour: string;
  productId: string;
  images: ProductImage[];
  variants: Variant[];
  drafts: Record<string, number>;
  saving: Record<string, boolean>;
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
    try { await onUploadFiles(arr); }
    catch { setUploadError('Upload failed — please try again.'); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  const totalVariantStock = variants.reduce((s, v) => s + (drafts[v.id] ?? v.stock_count), 0);

  return (
    <section style={{
      background: 'white', borderRadius: '.75rem',
      border: '1px solid #fce7f3',
      overflow: 'hidden', marginBottom: '1.1rem',
      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
    }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(to right, #fdf2f8, #fdf8ff)',
        padding: '.65rem 1rem',
        borderBottom: '1px solid #fce7f3',
        display: 'flex', alignItems: 'center', gap: '.5rem',
      }}>
        <span style={{ fontSize: '1.1rem' }}>🎨</span>
        <span style={{ fontWeight: 700, fontSize: '.92rem', color: '#9d174d', textTransform: 'capitalize', flex: 1 }}>
          {colour}
        </span>
        <span style={{ fontSize: '.7rem', color: '#9ca3af' }}>
          {images.length} image{images.length !== 1 ? 's' : ''}
          {variants.length > 0 && (
            ` · ${variants.length} size${variants.length !== 1 ? 's' : ''} · ${totalVariantStock} units`
          )}
        </span>
      </div>

      {/* Body */}
      <div style={{
        padding: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
      }}>

        {/* Photos */}
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Photos</div>

          {images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem', marginBottom: '.75rem' }}>
              {images.map((img, idx) => (
                <div key={img.id} style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url} alt={`${colour} ${idx + 1}`}
                    width={76} height={76}
                    style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: '.45rem', border: '1px solid #fce7f3' }}
                  />
                  {idx === 0 && (
                    <span style={{ position: 'absolute', bottom: 3, left: 3, fontSize: '.52rem', background: '#9d174d', color: 'white', borderRadius: '.25rem', padding: '.05rem .3rem', fontWeight: 700, lineHeight: 1.4 }}>MAIN</span>
                  )}
                  <button
                    onClick={() => onDeleteImage(img.id)}
                    style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, background: 'rgba(0,0,0,.55)', color: 'white', border: 'none', borderRadius: '50%', fontSize: '.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              borderRadius: '.6rem', padding: '.9rem .75rem',
              textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
              background: isDragOver ? '#fdf2f8' : '#fffbfd',
              transition: 'border-color .15s, background .15s',
            }}
          >
            {uploading ? (
              <div style={{ fontSize: '.78rem', color: '#9d174d', fontWeight: 600 }}>Uploading… ⏳</div>
            ) : (
              <>
                <div style={{ fontSize: '1.4rem', marginBottom: '.15rem' }}>📤</div>
                <div style={{ fontSize: '.75rem', color: '#6b7280', fontWeight: 600 }}>
                  {images.length > 0 ? 'Add more images' : 'Upload images for this colour'}
                </div>
                <div style={{ fontSize: '.68rem', color: '#9ca3af', marginTop: '.15rem' }}>Click or drag · JPG, PNG, WEBP · multiple OK</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
          {uploadError && <p style={{ color: '#ef4444', fontSize: '.72rem', marginTop: '.35rem' }}>{uploadError}</p>}
        </div>

        {/* Sizes & Stock */}
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Sizes &amp; Stock</div>

          {variants.length === 0 ? (
            <p style={{ fontSize: '.78rem', color: '#9ca3af', marginBottom: '.5rem' }}>No sizes yet — add one below.</p>
          ) : (
            <div style={{ marginBottom: '.6rem' }}>
              <VariantGrid
                variants={variants} drafts={drafts} saving={saving} setDrafts={setDrafts}
                onSave={onSaveStock} onDelete={onDeleteVariant}
              />
            </div>
          )}

          {!showSizeForm ? (
            <button
              onClick={() => setShowSizeForm(true)}
              style={{ fontSize: '.75rem', color: '#9d174d', background: '#fdf2f8', border: '1px dashed #fce7f3', borderRadius: '.4rem', padding: '.3rem .7rem', cursor: 'pointer', fontWeight: 600 }}
            >+ Add size</button>
          ) : (
            <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Size (S, M, 38…)" value={newSize}
                onChange={e => setNewSize(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSize.trim()) {
                    e.preventDefault();
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
                  style={{ width: '3rem', padding: '.3rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}
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

/* ────────────────────── VariantGrid ────────────────────── */
function VariantGrid({ variants, drafts, saving, setDrafts, onSave, onDelete }: {
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
        const qty     = drafts[v.id] ?? v.stock_count;
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
              <button
                disabled={saving[v.id]}
                onClick={() => onSave(v.id, v.size, qty)}
                style={{ fontSize: '.7rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.3rem', padding: '.18rem .35rem', cursor: 'pointer', fontWeight: 700 }}
              >{saving[v.id] ? '…' : '✓'}</button>
            )}
            <button
              onClick={() => onDelete(v.id)}
              style={{ fontSize: '.62rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '.1rem', lineHeight: 1 }}
              title="Remove size"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
