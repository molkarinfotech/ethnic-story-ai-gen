'use client';
import { useState, useEffect, useCallback } from 'react';

type ProductImage = { id: string; colour: string; url: string; sort_order: number };
type Variant     = { id: string; size: string; colour: string; stock_count: number };
type Product     = {
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

export default function InventoryPage({ params }: { params: { id: string } }) {
  const productId = params.id;

  const [product,  setProduct]  = useState<Product | null>(null);
  const [images,   setImages]   = useState<ProductImage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<Record<string, boolean>>({});
  const [drafts,   setDrafts]   = useState<Record<string, number>>({});

  // Add-image form
  const [addColour,   setAddColour]   = useState('');
  const [addUrl,      setAddUrl]      = useState('');
  const [addingImg,   setAddingImg]   = useState(false);
  const [imgError,    setImgError]    = useState('');

  // Add-variant form
  const [newSize,     setNewSize]     = useState('');
  const [newColour,   setNewColour]   = useState('');
  const [addingVar,   setAddingVar]   = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [prodRes, imgRes] = await Promise.all([
      fetch(`/api/admin/products/${productId}`).then(r => r.json()),
      fetch(`/api/product-images/${productId}`).then(r => r.json()),
    ]);
    if (!prodRes.error) setProduct(prodRes);
    setImages(Array.isArray(imgRes) ? imgRes : []);
    setLoading(false);
  }, [productId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Helpers ── */
  const colours = product
    ? [...new Set([
        ...product.variants.map(v => v.colour).filter(Boolean),
        ...images.map(i => i.colour).filter(Boolean),
      ])].sort()
    : [];

  function imagesByColour(colour: string) {
    return images.filter(i => i.colour === colour).sort((a,b) => a.sort_order - b.sort_order);
  }
  function variantsByColour(colour: string) {
    return sortVariants(product?.variants.filter(v => v.colour === colour) ?? []);
  }
  const noColourVariants = sortVariants(product?.variants.filter(v => !v.colour) ?? []);

  /* ── Stock save ── */
  async function saveStock(variantId: string, productId: string, size: string, colour: string, qty: number) {
    setSaving(s => ({ ...s, [variantId]: true }));
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId, product_id: productId, size, colour, stock_count: qty }),
    });
    setProduct(p => !p ? p : { ...p, variants: p.variants.map(v => v.id === variantId ? { ...v, stock_count: qty } : v) });
    setSaving(s => { const n={...s}; delete n[variantId]; return n; });
    setDrafts(d => { const n={...d}; delete n[variantId]; return n; });
  }

  /* ── Delete variant ── */
  async function deleteVariant(variantId: string) {
    if (!confirm('Remove this size variant?')) return;
    await fetch('/api/admin/stock', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId }),
    });
    setProduct(p => !p ? p : { ...p, variants: p.variants.filter(v => v.id !== variantId) });
  }

  /* ── Add variant ── */
  async function addVariant() {
    if (!newSize.trim()) return;
    setAddingVar(true);
    await fetch('/api/admin/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, size: newSize.trim(), colour: newColour.trim(), stock_count: 0 }),
    });
    setNewSize(''); setNewColour('');
    await loadAll();
    setAddingVar(false);
  }

  /* ── Add image ── */
  async function addImage() {
    if (!addUrl.trim()) { setImgError('Image URL is required'); return; }
    setAddingImg(true); setImgError('');
    const res = await fetch(`/api/product-images/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colour: addColour.trim(), url: addUrl.trim(), sort_order: imagesByColour(addColour.trim()).length }),
    });
    if (!res.ok) { const d = await res.json(); setImgError(d.error ?? 'Failed'); }
    else { const img = await res.json(); setImages(imgs => [...imgs, img]); setAddUrl(''); }
    setAddingImg(false);
  }

  /* ── Delete image ── */
  async function deleteImage(imageId: string) {
    if (!confirm('Remove this image?')) return;
    await fetch(`/api/product-images/${productId}?id=${imageId}`, { method: 'DELETE' });
    setImages(imgs => imgs.filter(i => i.id !== imageId));
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '.875rem' }}>
        Loading…
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: '2rem' }}>
        <a href="/admin/products" style={{ color: '#9d174d', textDecoration: 'none', fontSize: '.875rem' }}>← Back to Products</a>
        <p style={{ marginTop: '1rem', color: '#ef4444' }}>Product not found.</p>
      </div>
    );
  }

  const totalStock = product.variants.reduce((s, v) => s + v.stock_count, 0);

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Back + title */}
      <a href="/admin/products" style={{ color: '#9d174d', textDecoration: 'none', fontSize: '.82rem', fontWeight: 500 }}>← Products</a>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginTop: '.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '.25rem' }}>{product.name}</h1>
          <div style={{ fontSize: '.8rem', color: '#6b7280' }}>
            {product.category}{product.gender ? ` · ${product.gender}` : ''} · A${product.price}
            <span style={{
              marginLeft: '.6rem', fontSize: '.72rem', fontWeight: 700, borderRadius: '2rem', padding: '.15rem .55rem',
              background: totalStock === 0 ? '#fee2e2' : totalStock <= 5 ? '#fef9c3' : '#dcfce7',
              color: totalStock === 0 ? '#991b1b' : totalStock <= 5 ? '#854d0e' : '#166534',
            }}>
              {totalStock === 0 ? '⚠ Out of stock' : `${totalStock} units total`}
            </span>
          </div>
        </div>
        <a href={`/admin/products/${productId}/edit`} style={{ fontSize: '.8rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none', background: '#fdf2f8', borderRadius: '.4rem', padding: '.35rem .75rem' }}>Edit details →</a>
      </div>

      {/* ── Colour sections ── */}
      {colours.map(colour => (
        <ColourSection
          key={colour}
          colour={colour}
          images={imagesByColour(colour)}
          variants={variantsByColour(colour)}
          drafts={drafts}
          saving={saving}
          setDrafts={setDrafts}
          onSaveStock={(vid, size, qty) => saveStock(vid, productId, size, colour, qty)}
          onDeleteVariant={deleteVariant}
          onDeleteImage={deleteImage}
        />
      ))}

      {/* Variants with no colour */}
      {noColourVariants.length > 0 && (
        <section style={{ background: 'white', borderRadius: '.7rem', border: '1px solid #fce7f3', padding: '1.1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '.85rem', fontWeight: 700, color: '#374151', marginBottom: '.75rem' }}>Size variants (no colour)</h2>
          <VariantGrid
            variants={noColourVariants} drafts={drafts} saving={saving} setDrafts={setDrafts}
            onSave={(vid, size, qty) => saveStock(vid, productId, size, '', qty)}
            onDelete={deleteVariant}
          />
        </section>
      )}

      {/* ── Add section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>

        {/* Add variant */}
        <div style={{ background: 'white', borderRadius: '.7rem', border: '1px solid #fce7f3', padding: '1.1rem' }}>
          <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#374151', marginBottom: '.75rem' }}>+ Add size variant</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <input placeholder="Size (S, M, L, 32…)" value={newSize} onChange={e => setNewSize(e.target.value)}
              style={{ padding: '.4rem .65rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', outline: 'none' }} />
            <input placeholder="Colour (optional)" value={newColour} onChange={e => setNewColour(e.target.value)}
              style={{ padding: '.4rem .65rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', outline: 'none' }} />
            <button disabled={addingVar || !newSize.trim()} onClick={addVariant}
              style={{ padding: '.4rem .65rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.4rem', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', opacity: addingVar || !newSize.trim() ? .6 : 1 }}>
              {addingVar ? 'Adding…' : 'Add variant'}
            </button>
          </div>
        </div>

        {/* Add image */}
        <div style={{ background: 'white', borderRadius: '.7rem', border: '1px solid #fce7f3', padding: '1.1rem' }}>
          <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#374151', marginBottom: '.75rem' }}>+ Add product image</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <input placeholder="Colour (e.g. Red, Blue)" value={addColour} onChange={e => setAddColour(e.target.value)}
              style={{ padding: '.4rem .65rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', outline: 'none' }} />
            <input placeholder="Image URL (https://…)" value={addUrl} onChange={e => setAddUrl(e.target.value)}
              style={{ padding: '.4rem .65rem', border: '1px solid #e5e7eb', borderRadius: '.4rem', fontSize: '.82rem', outline: 'none' }} />
            {imgError && <p style={{ color: '#ef4444', fontSize: '.75rem', margin: 0 }}>{imgError}</p>}
            <button disabled={addingImg || !addUrl.trim()} onClick={addImage}
              style={{ padding: '.4rem .65rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.4rem', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', opacity: addingImg || !addUrl.trim() ? .6 : 1 }}>
              {addingImg ? 'Adding…' : 'Add image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Colour Section ── */
function ColourSection({
  colour, images, variants, drafts, saving, setDrafts, onSaveStock, onDeleteVariant, onDeleteImage,
}: {
  colour: string;
  images: ProductImage[];
  variants: Variant[];
  drafts: Record<string, number>;
  saving: Record<string, boolean>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSaveStock: (vid: string, size: string, qty: number) => Promise<void>;
  onDeleteVariant: (vid: string) => Promise<void>;
  onDeleteImage: (iid: string) => Promise<void>;
}) {
  return (
    <section style={{ background: 'white', borderRadius: '.7rem', border: '1px solid #fce7f3', overflow: 'hidden', marginBottom: '1rem' }}>
      <div style={{ background: '#fdf2f8', padding: '.6rem 1rem', borderBottom: '1px solid #fce7f3', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <span style={{ fontSize: '1rem' }}>🎨</span>
        <span style={{ fontWeight: 700, fontSize: '.88rem', color: '#9d174d', textTransform: 'capitalize' }}>{colour}</span>
        <span style={{ fontSize: '.72rem', color: '#9ca3af' }}>{images.length} image{images.length !== 1 ? 's' : ''} · {variants.length} size{variants.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* Images */}
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '.5rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>Images</div>
          {images.length === 0 && <p style={{ fontSize: '.78rem', color: '#9ca3af' }}>No images for this colour yet.</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
            {images.map((img, idx) => (
              <div key={img.id} style={{ position: 'relative', width: 70, height: 70 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`${colour} ${idx+1}`} width={70} height={70}
                  style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: '.4rem', border: '1px solid #fce7f3' }} />
                <button
                  onClick={() => onDeleteImage(img.id)}
                  style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: 'rgba(0,0,0,.55)', color: 'white', border: 'none', borderRadius: '50%', fontSize: '.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  title="Delete image"
                >✕</button>
                <div style={{ fontSize: '.6rem', color: '#9ca3af', textAlign: 'center', marginTop: '.15rem' }}>#{img.sort_order}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock by size */}
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '.5rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>Stock by size</div>
          {variants.length === 0 && <p style={{ fontSize: '.78rem', color: '#9ca3af' }}>No sizes for this colour yet.</p>}
          <VariantGrid
            variants={variants} drafts={drafts} saving={saving} setDrafts={setDrafts}
            onSave={onSaveStock}
            onDelete={onDeleteVariant}
          />
        </div>
      </div>
    </section>
  );
}

/* ── Variant grid (size chips with stock inputs) ── */
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
            background: 'white',
            border: `1px solid ${qty === 0 ? '#fecaca' : qty <= 3 ? '#fef08a' : '#e5e7eb'}`,
            borderRadius: '.45rem', padding: '.28rem .45rem',
          }}>
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#374151', minWidth: '1.8rem' }}>{v.size}</span>
            <input type="number" min={0} value={qty}
              onChange={e => setDrafts(d => ({ ...d, [v.id]: parseInt(e.target.value) || 0 }))}
              style={{ width: '3.2rem', padding: '.18rem .3rem', border: '1px solid #e5e7eb', borderRadius: '.3rem', fontSize: '.78rem', textAlign: 'center', outline: 'none' }}
            />
            {isDirty && (
              <button disabled={saving[v.id]} onClick={() => onSave(v.id, v.size, qty)}
                style={{ fontSize: '.7rem', background: '#9d174d', color: 'white', border: 'none', borderRadius: '.3rem', padding: '.18rem .38rem', cursor: 'pointer', fontWeight: 700 }}>
                {saving[v.id] ? '…' : '✓'}
              </button>
            )}
            <button onClick={() => onDelete(v.id)}
              style={{ fontSize: '.62rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '.1rem', lineHeight: 1 }}
              title="Remove">
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
