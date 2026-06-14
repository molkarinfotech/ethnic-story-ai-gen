'use client';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SuggestedProduct = { id: string; name: string; slug: string; category: string };

type FormState = {
  productId: string;
  productName: string;
  colour: string;
  size: string;
  stockCount: number;
};

type NewProductForm = {
  name: string;
  category: string;
  price: string;
  original_price: string;
  description: string;
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const CATEGORIES = ['sarees', 'lehengas', 'kurtas', 'kids'];

const card: React.CSSProperties = {
  background: 'white', borderRadius: '1rem',
  boxShadow: '0 2px 12px rgba(0,0,0,.08)',
  padding: '1.25rem', marginBottom: '1rem',
};
const pill = (active: boolean): React.CSSProperties => ({
  padding: '.35rem .9rem', borderRadius: '2rem', fontSize: '.8rem', fontWeight: 600,
  border: active ? '2px solid #9d174d' : '1.5px solid #e5e7eb',
  background: active ? '#fdf2f8' : 'white',
  color: active ? '#9d174d' : '#374151',
  cursor: 'pointer', transition: 'all .15s',
});
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '.65rem .85rem', border: '1.5px solid #e5e7eb',
  borderRadius: '.65rem', fontSize: '.95rem', boxSizing: 'border-box', background: 'white',
};
const selectStyle = {
  width: '100%', padding: '.65rem .85rem', border: '1.5px solid #e5e7eb',
  borderRadius: '.65rem', fontSize: '.95rem', background: 'white', cursor: 'pointer',
} as React.CSSProperties;
const fieldLabel: React.CSSProperties = {
  fontSize: '.8rem', fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem',
};
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '1rem', borderRadius: '.75rem', border: 'none',
  background: '#9d174d', color: 'white', fontSize: '1rem', fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
};
const btnSecondary: React.CSSProperties = {
  width: '100%', padding: '.75rem', borderRadius: '.75rem',
  border: '1.5px solid #9d174d', background: 'white',
  color: '#9d174d', fontSize: '.9rem', fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function ScanPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview,   setPreview]   = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Product list — loaded once on mount
  const [allProducts,     setAllProducts]     = useState<SuggestedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch,   setProductSearch]   = useState('');
  const [showNewProduct,  setShowNewProduct]  = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [form, setForm] = useState<FormState>({
    productId: '', productName: '', colour: '', size: '', stockCount: 1,
  });

  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: '', category: '', price: '', original_price: '', description: '',
  });

  async function authFetch(url: string, init: RequestInit = {}) {
    const res = await fetch(url, { ...init, credentials: 'include' });
    if (res.status === 401) {
      router.push('/admin/login');
      throw new Error('Session expired — please log in again');
    }
    return res;
  }

  // Load products list
  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const res  = await authFetch('/api/admin/products');
      const data = await res.json();
      if (Array.isArray(data)) setAllProducts(data);
    } catch { /* silent */ } finally {
      setLoadingProducts(false);
    }
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null); setSaved(false); setShowNewProduct(false);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    // Load the product list now so the dropdown is ready
    await loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setPreview(null); setImageFile(null);
    setSaved(false); setError(null); setShowNewProduct(false); setProductSearch('');
    setAllProducts([]);
    setForm({ productId: '', productName: '', colour: '', size: '', stockCount: 1 });
    setNewProduct({ name: '', category: '', price: '', original_price: '', description: '' });
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleCreateProduct() {
    if (!newProduct.name)     { setError('Product name is required'); return; }
    if (!newProduct.category) { setError('Category is required');     return; }
    if (!newProduct.price)    { setError('Price is required');        return; }
    setCreatingProduct(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        name:     newProduct.name.trim(),
        slug:     slugify(newProduct.name),
        category: newProduct.category,
        price:    parseFloat(newProduct.price),
        in_stock: true,
      };
      if (newProduct.original_price) body.original_price = parseFloat(newProduct.original_price);
      if (newProduct.description)    body.description    = newProduct.description.trim();

      const res  = await authFetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create product');

      setAllProducts(prev => [data, ...prev]);
      setForm(f => ({ ...f, productId: data.id, productName: data.name }));
      setShowNewProduct(false);
      setNewProduct({ name: '', category: '', price: '', original_price: '', description: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleSave() {
    if (!form.productId) { setError('Please select a product'); return; }
    if (!form.size)      { setError('Please select a size');    return; }
    if (!imageFile)      { setError('No image to upload');      return; }
    setSaving(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('image',      imageFile);
      fd.append('product_id', form.productId);
      fd.append('colour',     form.colour);
      fd.append('sort_order', '0');
      const uploadRes  = await authFetch('/api/admin/scan-upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed');

      const stockRes  = await authFetch('/api/admin/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: form.productId,
          size: form.size,
          colour: form.colour,
          stock_count: form.stockCount,
        }),
      });
      const stockData = await stockRes.json();
      if (!stockRes.ok) throw new Error(stockData.error ?? 'Stock update failed');

      setSaved(true);
      setTimeout(reset, 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredProds = productSearch.trim()
    ? allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : allProducts;

  const showForm = preview !== null;

  return (
    <div style={{ minHeight: '100dvh', background: '#fdf2f8', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: '#9d174d', color: 'white', padding: '.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>📷 Inventory Scanner</span>
        </div>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1rem' }}>

        {/* Camera picker */}
        {!preview && (
          <div onClick={() => fileRef.current?.click()}
            style={{ background: 'white', border: '2px dashed #e9a8c8', borderRadius: '1.25rem', padding: '3rem 1rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '.5rem' }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#9d174d' }}>Tap to photograph garment</div>
            <div style={{ color: '#9ca3af', fontSize: '.85rem', marginTop: '.3rem' }}>Camera or choose from library</div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onInputChange} style={{ display: 'none' }} />
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div style={{ ...card, padding: 0, overflow: 'hidden', position: 'relative', marginBottom: '1rem' }}>
            <img src={preview} alt="Scanned" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
            {saved && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '.5rem' }}>
                <div style={{ fontSize: '3rem' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Saved to Inventory!</div>
              </div>
            )}
            {!saved && (
              <button onClick={reset} style={{ position: 'absolute', top: '.6rem', right: '.6rem', background: 'rgba(0,0,0,.5)', color: 'white', border: 'none', borderRadius: '2rem', padding: '.3rem .75rem', fontSize: '.8rem', cursor: 'pointer' }}>↺ Retake</button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.75rem', padding: '.85rem 1rem', color: '#dc2626', fontSize: '.875rem', marginBottom: '1rem' }}>
            ❌ {error}
          </div>
        )}

        {/* Form */}
        {showForm && !saved && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>✏️ Fill in details</div>

            {/* Product picker */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={fieldLabel}>Product</label>

              {!showNewProduct && (
                <>
                  {loadingProducts ? (
                    <div style={{ color: '#9ca3af', fontSize: '.85rem', padding: '.5rem 0' }}>Loading products…</div>
                  ) : (
                    <>
                      <input
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search products…"
                        style={{ ...inputStyle, marginBottom: '.4rem' }}
                      />
                      <select
                        value={form.productId}
                        onChange={e => {
                          const id = e.target.value;
                          const name = filteredProds.find(p => p.id === id)?.name ?? '';
                          setForm(f => ({ ...f, productId: id, productName: name }));
                        }}
                        style={selectStyle}
                      >
                        <option value="">— Select a product —</option>
                        {filteredProds.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                        ))}
                      </select>
                      {form.productId && (
                        <div style={{ marginTop: '.4rem', fontSize: '.8rem', color: '#16a34a', fontWeight: 600 }}>✓ {form.productName}</div>
                      )}
                    </>
                  )}
                  <button onClick={() => { setShowNewProduct(true); setError(null); }} style={{ ...btnSecondary, marginTop: '.6rem' }}>
                    + Add New Product
                  </button>
                </>
              )}

              {showNewProduct && (
                <div style={{ background: '#fdf2f8', borderRadius: '.75rem', padding: '1rem', border: '1.5px solid #fbcfe8' }}>
                  <div style={{ fontWeight: 700, marginBottom: '.75rem', color: '#9d174d', fontSize: '.9rem' }}>🆕 New Product Details</div>

                  <div style={{ marginBottom: '.65rem' }}>
                    <label style={fieldLabel}>Product Name *</label>
                    <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Red Bridal Lehenga" style={inputStyle} />
                  </div>

                  <div style={{ marginBottom: '.65rem' }}>
                    <label style={fieldLabel}>Category *</label>
                    <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} style={selectStyle}>
                      <option value="">— Select —</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '.65rem' }}>
                    <div>
                      <label style={fieldLabel}>Selling Price (₹) *</label>
                      <input type="number" min="0" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 4999" style={inputStyle} />
                    </div>
                    <div>
                      <label style={fieldLabel}>Original Price (₹)</label>
                      <input type="number" min="0" value={newProduct.original_price} onChange={e => setNewProduct(p => ({ ...p, original_price: e.target.value }))} placeholder="e.g. 6999" style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '.75rem' }}>
                    <label style={fieldLabel}>Description</label>
                    <textarea
                      value={newProduct.description}
                      onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                      placeholder="Optional — fabric, occasion, notes…"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button onClick={handleCreateProduct} disabled={creatingProduct} style={{ ...btnPrimary, flex: 1, opacity: creatingProduct ? .7 : 1 }}>
                      {creatingProduct ? '⏳ Creating…' : '✅ Create Product'}
                    </button>
                    <button onClick={() => { setShowNewProduct(false); setError(null); }} style={{ padding: '.75rem 1rem', borderRadius: '.75rem', border: '1.5px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Colour */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={fieldLabel}>Colour</label>
              <input value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} placeholder="e.g. Red, Royal Blue…" style={inputStyle} />
            </div>

            {/* Size */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={fieldLabel}>Size</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.5rem' }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, size: s }))} style={pill(form.size === s)}>{s}</button>
                ))}
              </div>
              <input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="Or type a size…" style={inputStyle} />
            </div>

            {/* Stock qty */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={fieldLabel}>Stock qty</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setForm(f => ({ ...f, stockCount: Math.max(0, f.stockCount - 1) }))} style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, minWidth: '2.5rem', textAlign: 'center' }}>{form.stockCount}</span>
                <button onClick={() => setForm(f => ({ ...f, stockCount: f.stockCount + 1 }))} style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>
              {saving ? '⏳ Saving…' : '💾 Save to Inventory'}
            </button>
          </div>
        )}

        {!preview && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.85rem', marginTop: '1.5rem', lineHeight: 1.7 }}>
            Photograph the garment, then fill in colour, size and stock.<br />
            The image will be saved and linked to the product automatically.
          </div>
        )}
      </div>
    </div>
  );
}
