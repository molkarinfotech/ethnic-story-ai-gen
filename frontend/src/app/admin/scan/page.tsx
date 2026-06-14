'use client';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SuggestedProduct = { id: string; name: string; slug: string; category: string };

type VisionResult = {
  visionSkipped: boolean;
  visionError: string | null;
  labels: string[];
  detectedCategory: string | null;
  detectedColours: { name: string; score: number }[];
  primaryColour: string | null;
  detectedSize: string | null;
  fullText: string;
  suggestedProducts: SuggestedProduct[];
  allProducts: SuggestedProduct[];
};

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

  const [preview,      setPreview]      = useState<string | null>(null);
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [analysing,    setAnalysing]    = useState(false);
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);

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

  const handleFile = useCallback(async (file: File) => {
    setError(null); setSaved(false); setShowNewProduct(false); setVisionResult(null);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));

    // ── Call Google Vision analyse endpoint ──────────────────────────────────
    setAnalysing(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await authFetch('/api/admin/scan-analyse', { method: 'POST', body: fd });
      const data: VisionResult = await res.json();
      setVisionResult(data);
      setAllProducts(data.allProducts ?? []);

      // Auto-populate colour + size from Vision if detected
      setForm(f => ({
        ...f,
        colour: data.primaryColour ?? f.colour,
        size:   data.detectedSize  ?? f.size,
      }));
    } catch (e: any) {
      // Vision failed — still load product list manually
      setLoadingProducts(true);
      try {
        const res  = await authFetch('/api/admin/products');
        const data = await res.json();
        if (Array.isArray(data)) setAllProducts(data);
      } catch { /* silent */ } finally {
        setLoadingProducts(false);
      }
    } finally {
      setAnalysing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setPreview(null); setImageFile(null);
    setSaved(false); setError(null); setShowNewProduct(false); setProductSearch('');
    setAllProducts([]); setVisionResult(null);
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

  // Suggested products from Vision (only when Vision ran successfully)
  const suggestedProds: SuggestedProduct[] =
    visionResult && !visionResult.visionSkipped ? visionResult.suggestedProducts : [];

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

        {/* Analysing spinner */}
        {analysing && (
          <div style={{ background: 'white', borderRadius: '.75rem', padding: '.85rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <span style={{ fontSize: '1.3rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔍</span>
            <span style={{ fontSize: '.9rem', color: '#6b7280', fontWeight: 600 }}>Analysing image with Google Vision…</span>
          </div>
        )}

        {/* Vision results card */}
        {visionResult && !analysing && (
          <div style={{ ...card, marginBottom: '1rem', background: visionResult.visionSkipped ? '#fffbeb' : '#f0fdf4', border: `1px solid ${visionResult.visionSkipped ? '#fde68a' : '#bbf7d0'}` }}>
            {visionResult.visionSkipped ? (
              <div style={{ fontSize: '.82rem', color: '#92400e' }}>
                ⚠️ <strong>Vision skipped:</strong> {visionResult.visionError}
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#15803d', marginBottom: '.5rem' }}>🤖 Google Vision detected:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginBottom: '.45rem' }}>
                  {visionResult.detectedColours.map(c => (
                    <span key={c.name} style={{ background: '#dcfce7', color: '#166534', borderRadius: '.4rem', padding: '.2rem .55rem', fontSize: '.75rem', fontWeight: 600 }}>🎨 {c.name}</span>
                  ))}
                  {visionResult.detectedCategory && (
                    <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: '.4rem', padding: '.2rem .55rem', fontSize: '.75rem', fontWeight: 600 }}>📂 {visionResult.detectedCategory}</span>
                  )}
                  {visionResult.detectedSize && (
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '.4rem', padding: '.2rem .55rem', fontSize: '.75rem', fontWeight: 600 }}>📏 {visionResult.detectedSize}</span>
                  )}
                </div>
                {visionResult.labels.length > 0 && (
                  <div style={{ fontSize: '.75rem', color: '#4b5563' }}>Labels: {visionResult.labels.slice(0, 8).join(', ')}</div>
                )}
              </>
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
                      {/* Vision suggestions */}
                      {suggestedProds.length > 0 && !form.productId && (
                        <div style={{ marginBottom: '.6rem' }}>
                          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '.3rem' }}>🤖 Suggested matches:</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                            {suggestedProds.map(p => (
                              <button key={p.id}
                                onClick={() => setForm(f => ({ ...f, productId: p.id, productName: p.name }))}
                                style={{ textAlign: 'left', padding: '.5rem .75rem', borderRadius: '.5rem', border: '1.5px solid #e9d5ff', background: '#faf5ff', color: '#4c1d95', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                ✨ {p.name} <span style={{ fontWeight: 400, color: '#7c3aed' }}>({p.category})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

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
            Google Vision will auto-detect colour, category and size.
          </div>
        )}
      </div>
    </div>
  );
}
