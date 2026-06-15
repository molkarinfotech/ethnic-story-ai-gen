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

type ModelImage = { url: string | null; b64: string | null };

type ExtraImageItem = {
  file: File;
  preview: string;
  colour: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

const SIZES      = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const CATEGORIES = ['sarees', 'lehengas', 'kurtas', 'kids'];
const MODEL_STYLES = [
  { id: 'studio',    label: '🎞️ Studio',    desc: 'White background, clean e-com look' },
  { id: 'outdoor',   label: '🌿 Outdoor',   desc: 'Natural light, heritage backdrop' },
  { id: 'editorial', label: '✨ Editorial', desc: 'Dramatic Vogue-style lighting' },
];

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
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '.65rem .85rem', border: '1.5px solid #e5e7eb',
  borderRadius: '.65rem', fontSize: '.95rem', background: 'white', cursor: 'pointer',
};
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

const stepBadge = (active: boolean, done: boolean): React.CSSProperties => ({
  width: '1.6rem', height: '1.6rem', borderRadius: '50%', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700,
  flexShrink: 0,
  background: done ? '#16a34a' : active ? '#9d174d' : '#e5e7eb',
  color: done || active ? 'white' : '#9ca3af',
});

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildDefaultPrompt(visionResult: VisionResult | null, form: FormState): string {
  const parts: string[] = [];
  if (form.colour)                        parts.push(form.colour);
  if (visionResult?.detectedCategory)     parts.push(visionResult.detectedCategory);
  if (visionResult?.labels?.length)       parts.push(visionResult.labels.slice(0, 4).join(', '));
  if (form.productName)                   parts.push(form.productName);
  const garmentDesc = parts.filter(Boolean).join(' ') || 'ethnic Indian garment';
  return `A South Asian female model wearing a ${garmentDesc}. Full-body portrait, professional fashion photography, sharp focus on the garment details.`;
}

export default function ScanPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  const [preview,      setPreview]      = useState<string | null>(null);
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [analysing,    setAnalysing]    = useState(false);
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);

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

  // Step 2b — extra images
  const [extraImages,        setExtraImages]        = useState<ExtraImageItem[]>([]);
  const [uploadingExtras,    setUploadingExtras]    = useState(false);
  const [extraUploadDone,    setExtraUploadDone]    = useState(false);

  // Step 3 — AI Model Gen
  const [showModelGen,    setShowModelGen]    = useState(false);
  const [modelStyle,      setModelStyle]      = useState('studio');
  const [modelPrompt,     setModelPrompt]     = useState('');
  const [promptTouched,   setPromptTouched]   = useState(false);
  const [generatingModel, setGeneratingModel] = useState(false);
  const [modelImages,     setModelImages]     = useState<ModelImage[]>([]);
  const [modelError,      setModelError]      = useState<string | null>(null);
  const [savedModelIdxs,  setSavedModelIdxs]  = useState<Set<number>>(new Set());
  const [savingModelIdx,  setSavingModelIdx]  = useState<number | null>(null);

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
    setModelImages([]); setModelError(null); setSavedModelIdxs(new Set());
    setPromptTouched(false); setModelPrompt('');
    setExtraImages([]); setExtraUploadDone(false);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));

    setAnalysing(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await authFetch('/api/admin/scan-analyse', { method: 'POST', body: fd });
      const data: VisionResult = await res.json();
      setVisionResult(data);
      setAllProducts(data.allProducts ?? []);
      setForm(f => ({
        ...f,
        colour: data.primaryColour ?? f.colour,
        size:   data.detectedSize  ?? f.size,
      }));
    } catch {
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

  // ── Extra images picker ───────────────────────────────────────────────────
  function onExtraFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const items: ExtraImageItem[] = files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      colour: form.colour || '',
      status: 'pending',
    }));
    setExtraImages(prev => [...prev, ...items]);
    setExtraUploadDone(false);
    // reset file input so same file can be picked again
    if (extraFileRef.current) extraFileRef.current.value = '';
  }

  function removeExtraImage(idx: number) {
    setExtraImages(prev => prev.filter((_, i) => i !== idx));
  }

  function setExtraColour(idx: number, colour: string) {
    setExtraImages(prev => prev.map((item, i) => i === idx ? { ...item, colour } : item));
  }

  async function handleUploadExtras() {
    if (!extraImages.length) return;
    setUploadingExtras(true);
    // sort_order starts at 1 (0 is reserved for the main scanned photo)
    let sortOrder = 1;
    for (let i = 0; i < extraImages.length; i++) {
      const item = extraImages[i];
      if (item.status === 'done') { sortOrder++; continue; }
      setExtraImages(prev => prev.map((x, idx) => idx === i ? { ...x, status: 'uploading' } : x));
      try {
        const fd = new FormData();
        fd.append('image',      item.file);
        fd.append('product_id', form.productId);
        fd.append('colour',     item.colour || form.colour || 'Unassigned');
        fd.append('sort_order', String(sortOrder));
        const res  = await authFetch('/api/admin/scan-upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Upload failed');
        setExtraImages(prev => prev.map((x, idx) => idx === i ? { ...x, status: 'done' } : x));
        sortOrder++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setExtraImages(prev => prev.map((x, idx) => idx === i ? { ...x, status: 'error', error: msg } : x));
      }
    }
    setUploadingExtras(false);
    setExtraUploadDone(true);
  }

  function reset() {
    setPreview(null); setImageFile(null);
    setSaved(false); setError(null); setShowNewProduct(false); setProductSearch('');
    setAllProducts([]); setVisionResult(null);
    setForm({ productId: '', productName: '', colour: '', size: '', stockCount: 1 });
    setNewProduct({ name: '', category: '', price: '', original_price: '', description: '' });
    setShowModelGen(false); setModelImages([]); setModelError(null);
    setSavedModelIdxs(new Set()); setModelPrompt(''); setPromptTouched(false);
    setExtraImages([]); setExtraUploadDone(false);
    if (fileRef.current) fileRef.current.value = '';
    if (extraFileRef.current) extraFileRef.current.value = '';
  }

  // ── Step 2: Save to inventory ─────────────────────────────────────────────
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
          product_id:  form.productId,
          size:        form.size,
          colour:      form.colour,
          stock_count: form.stockCount,
        }),
      });
      const stockData = await stockRes.json();
      if (!stockRes.ok) throw new Error(stockData.error ?? 'Stock update failed');

      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Step 3: Generate model images ─────────────────────────────────────────
  async function handleGenerateModel() {
    setGeneratingModel(true); setModelError(null); setModelImages([]); setSavedModelIdxs(new Set());
    try {
      const fd = new FormData();
      fd.append('style',  modelStyle);
      fd.append('prompt', promptTouched ? modelPrompt : buildDefaultPrompt(visionResult, form));
      const res  = await authFetch('/api/admin/scan-model-gen', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setModelImages(data.images ?? []);
    } catch (e: unknown) {
      setModelError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGeneratingModel(false);
    }
  }

  async function handleSaveModelImage(idx: number) {
    if (!form.productId) {
      setModelError('Select a product first before saving a model image.');
      return;
    }
    const img = modelImages[idx];
    const src = img.url ?? (img.b64 ? `data:image/png;base64,${img.b64}` : null);
    if (!src) return;

    setSavingModelIdx(idx); setModelError(null);
    try {
      let blob: Blob;
      if (img.url) {
        const r = await fetch(img.url);
        blob = await r.blob();
      } else {
        const binary = atob(img.b64!);
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
        blob = new Blob([arr], { type: 'image/png' });
      }
      const file = new File([blob], `model-gen-${Date.now()}.png`, { type: 'image/png' });
      const fd = new FormData();
      fd.append('image',      file);
      fd.append('product_id', form.productId);
      fd.append('colour',     form.colour || 'default');
      fd.append('sort_order', String(idx + 1));
      const res  = await authFetch('/api/admin/scan-upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setSavedModelIdxs(prev => new Set(prev).add(idx));
    } catch (e: unknown) {
      setModelError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingModelIdx(null);
    }
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreatingProduct(false);
    }
  }

  const filteredProds = productSearch.trim()
    ? allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : allProducts;

  const showForm    = preview !== null && !analysing;
  const suggestedProds: SuggestedProduct[] =
    visionResult && !visionResult.visionSkipped ? visionResult.suggestedProducts : [];

  const step1Done   = !!preview && !analysing;
  const step2Done   = saved;
  const step3Active = saved;

  const displayPrompt = promptTouched ? modelPrompt : buildDefaultPrompt(visionResult, form);

  const allExtrasDone = extraImages.length > 0 && extraImages.every(x => x.status === 'done');

  return (
    <div style={{ minHeight: '100dvh', background: '#fdf2f8', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: '#9d174d', color: 'white', padding: '.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>📷 Inventory Scanner</span>
        </div>
        {preview && (
          <button onClick={reset} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: 'white', borderRadius: '.5rem', padding: '.3rem .75rem', fontSize: '.8rem', cursor: 'pointer', fontWeight: 600 }}>↺ New Scan</button>
        )}
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1rem' }}>

        {/* ── STEP 1 ──────────────────────────────────────────────────── */}
        <div style={{ ...card, border: step1Done ? '1.5px solid #bbf7d0' : '1.5px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: preview ? '.85rem' : 0 }}>
            <div style={stepBadge(true, step1Done)}>{step1Done ? '✓' : '1'}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', color: step1Done ? '#15803d' : '#111827' }}>Photograph Garment</div>
              <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>Google Vision auto-detects colour, size &amp; category</div>
            </div>
          </div>

          {!preview && (
            <div onClick={() => fileRef.current?.click()}
              style={{ background: '#fdf2f8', border: '2px dashed #e9a8c8', borderRadius: '1rem', padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', marginTop: '.85rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '.4rem' }}>📷</div>
              <div style={{ fontWeight: 700, color: '#9d174d' }}>Tap to photograph</div>
              <div style={{ color: '#9ca3af', fontSize: '.8rem', marginTop: '.25rem' }}>Camera or photo library</div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onInputChange} style={{ display: 'none' }} />
            </div>
          )}

          {preview && (
            <div style={{ position: 'relative', borderRadius: '.75rem', overflow: 'hidden' }}>
              <img src={preview} alt="Scanned" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }} />
              {!saved && (
                <button onClick={() => fileRef.current?.click()}
                  style={{ position: 'absolute', top: '.5rem', right: '.5rem', background: 'rgba(0,0,0,.5)', color: 'white', border: 'none', borderRadius: '2rem', padding: '.3rem .75rem', fontSize: '.75rem', cursor: 'pointer' }}>
                  ↺ Retake
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onInputChange} style={{ display: 'none' }} />
            </div>
          )}

          {analysing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginTop: '.75rem', padding: '.65rem .85rem', background: '#f0fdf4', borderRadius: '.65rem' }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔍</span>
              <span style={{ fontSize: '.85rem', color: '#15803d', fontWeight: 600 }}>Analysing with Google Vision…</span>
            </div>
          )}

          {visionResult && !analysing && (
            <div style={{ marginTop: '.75rem', padding: '.75rem .85rem', background: visionResult.visionSkipped ? '#fffbeb' : '#f0fdf4', borderRadius: '.65rem', border: `1px solid ${visionResult.visionSkipped ? '#fde68a' : '#bbf7d0'}` }}>
              {visionResult.visionSkipped ? (
                <div style={{ fontSize: '.82rem', color: '#92400e' }}>⚠️ Vision skipped: {visionResult.visionError}</div>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: '.8rem', color: '#15803d', marginBottom: '.4rem' }}>🤖 Detected:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                    {visionResult.detectedColours.map(c => (
                      <span key={c.name} style={{ background: '#dcfce7', color: '#166534', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 600 }}>🎨 {c.name}</span>
                    ))}
                    {visionResult.detectedCategory && (
                      <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 600 }}>📂 {visionResult.detectedCategory}</span>
                    )}
                    {visionResult.detectedSize && (
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 600 }}>📏 {visionResult.detectedSize}</span>
                    )}
                    {visionResult.labels.slice(0, 5).map(l => (
                      <span key={l} style={{ background: '#f3f4f6', color: '#4b5563', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.72rem' }}>{l}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── STEP 2 ──────────────────────────────────────────────────── */}
        {showForm && (
          <div style={{ ...card, border: step2Done ? '1.5px solid #bbf7d0' : '1.5px solid #e5e7eb', opacity: analysing ? .5 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '1rem' }}>
              <div style={stepBadge(!step2Done, step2Done)}>{step2Done ? '✓' : '2'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem', color: step2Done ? '#15803d' : '#111827' }}>Product Details &amp; Save</div>
                <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>Scanned photo saves automatically as product image</div>
              </div>
              {step2Done && (
                <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#15803d', borderRadius: '2rem', padding: '.2rem .65rem', fontSize: '.75rem', fontWeight: 700 }}>✅ Saved</span>
              )}
            </div>

            {!step2Done && (
              <>
                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.65rem', padding: '.7rem .85rem', color: '#dc2626', fontSize: '.82rem', marginBottom: '.85rem' }}>❌ {error}</div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={fieldLabel}>Product</label>
                  {!showNewProduct && (
                    <>
                      {suggestedProds.length > 0 && !form.productId && (
                        <div style={{ marginBottom: '.6rem' }}>
                          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '.3rem' }}>🤖 Suggested matches:</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                            {suggestedProds.map(p => (
                              <button key={p.id} onClick={() => setForm(f => ({ ...f, productId: p.id, productName: p.name }))}
                                style={{ textAlign: 'left', padding: '.5rem .75rem', borderRadius: '.5rem', border: '1.5px solid #e9d5ff', background: '#faf5ff', color: '#4c1d95', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                ✨ {p.name} <span style={{ fontWeight: 400, color: '#7c3aed' }}>({p.category})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {loadingProducts ? (
                        <div style={{ color: '#9ca3af', fontSize: '.85rem', padding: '.4rem 0' }}>Loading products…</div>
                      ) : (
                        <>
                          <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products…" style={{ ...inputStyle, marginBottom: '.4rem' }} />
                          <select value={form.productId}
                            onChange={e => {
                              const id   = e.target.value;
                              const name = filteredProds.find(p => p.id === id)?.name ?? '';
                              setForm(f => ({ ...f, productId: id, productName: name }));
                            }}
                            style={selectStyle}>
                            <option value="">— Select a product —</option>
                            {filteredProds.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
                          </select>
                          {form.productId && (
                            <div style={{ marginTop: '.35rem', fontSize: '.8rem', color: '#16a34a', fontWeight: 600 }}>✓ {form.productName}</div>
                          )}
                        </>
                      )}
                      <button onClick={() => { setShowNewProduct(true); setError(null); }} style={{ ...btnSecondary, marginTop: '.6rem' }}>+ Add New Product</button>
                    </>
                  )}

                  {showNewProduct && (
                    <div style={{ background: '#fdf2f8', borderRadius: '.75rem', padding: '1rem', border: '1.5px solid #fbcfe8' }}>
                      <div style={{ fontWeight: 700, marginBottom: '.75rem', color: '#9d174d', fontSize: '.9rem' }}>🆕 New Product</div>
                      <div style={{ marginBottom: '.6rem' }}>
                        <label style={fieldLabel}>Name *</label>
                        <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Red Bridal Lehenga" style={inputStyle} />
                      </div>
                      <div style={{ marginBottom: '.6rem' }}>
                        <label style={fieldLabel}>Category *</label>
                        <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} style={selectStyle}>
                          <option value="">— Select —</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '.6rem' }}>
                        <div>
                          <label style={fieldLabel}>Price (₹) *</label>
                          <input type="number" min="0" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="4999" style={inputStyle} />
                        </div>
                        <div>
                          <label style={fieldLabel}>Original (₹)</label>
                          <input type="number" min="0" value={newProduct.original_price} onChange={e => setNewProduct(p => ({ ...p, original_price: e.target.value }))} placeholder="6999" style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ marginBottom: '.75rem' }}>
                        <label style={fieldLabel}>Description</label>
                        <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Fabric, occasion, notes…" rows={2} style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties} />
                      </div>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button onClick={handleCreateProduct} disabled={creatingProduct} style={{ ...btnPrimary, flex: 1, padding: '.75rem', opacity: creatingProduct ? .7 : 1 }}>{creatingProduct ? '⏳ Creating…' : '✅ Create'}</button>
                        <button onClick={() => { setShowNewProduct(false); setError(null); }} style={{ padding: '.75rem 1rem', borderRadius: '.75rem', border: '1.5px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={fieldLabel}>Colour</label>
                  <input value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} placeholder="e.g. Red, Royal Blue…" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={fieldLabel}>Size</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.5rem' }}>
                    {SIZES.map(s => <button key={s} onClick={() => setForm(f => ({ ...f, size: s }))} style={pill(form.size === s)}>{s}</button>)}
                  </div>
                  <input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="Or type a size…" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={fieldLabel}>Stock qty</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => setForm(f => ({ ...f, stockCount: Math.max(0, f.stockCount - 1) }))} style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: '1.6rem', fontWeight: 700, minWidth: '2.5rem', textAlign: 'center' }}>{form.stockCount}</span>
                    <button onClick={() => setForm(f => ({ ...f, stockCount: f.stockCount + 1 }))} style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '.65rem', padding: '.6rem .85rem', fontSize: '.8rem', color: '#15803d', marginBottom: '1rem', fontWeight: 600 }}>
                  📸 The scanned photo will be saved as the product image automatically.
                </div>

                <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>
                  {saving ? '⏳ Saving…' : '💾 Save to Inventory'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 2b: Extra Images ────────────────────────────────────── */}
        {step2Done && (
          <div style={{ ...card, border: allExtrasDone ? '1.5px solid #bbf7d0' : '1.5px solid #e0e7ff', background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: extraImages.length > 0 ? '1rem' : 0 }}>
              <div style={stepBadge(true, allExtrasDone)}>
                {allExtrasDone ? '✓' : <span style={{ fontSize: '.7rem' }}>2b</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', color: allExtrasDone ? '#15803d' : '#111827' }}>Extra Images <span style={{ fontSize: '.75rem', fontWeight: 400, color: '#9ca3af' }}>(optional)</span></div>
                <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>Upload additional angles, details or colour variants</div>
              </div>
              <button
                onClick={() => extraFileRef.current?.click()}
                style={{ padding: '.35rem .85rem', borderRadius: '2rem', border: '1.5px solid #6366f1', background: '#eef2ff', color: '#4338ca', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                + Add Photos
              </button>
              <input
                ref={extraFileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onExtraFilesChange}
                style={{ display: 'none' }}
              />
            </div>

            {extraImages.length > 0 && (
              <>
                {/* Image grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem', marginBottom: '1rem' }}>
                  {extraImages.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: '.6rem', overflow: 'hidden', border: item.status === 'done' ? '2px solid #16a34a' : item.status === 'error' ? '2px solid #dc2626' : '1.5px solid #e5e7eb' }}>
                      <img src={item.preview} alt={`Extra ${idx + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />

                      {/* Status overlay */}
                      {item.status === 'uploading' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1.3rem' }}>⏳</span>
                        </div>
                      )}
                      {item.status === 'done' && (
                        <div style={{ position: 'absolute', top: '.3rem', right: '.3rem', background: '#16a34a', borderRadius: '50%', width: '1.4rem', height: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', color: 'white', fontWeight: 700 }}>✓</div>
                      )}
                      {item.status === 'error' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,38,38,.15)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '.3rem' }}>
                          <span style={{ fontSize: '.6rem', color: '#dc2626', fontWeight: 700, background: 'white', borderRadius: '.3rem', padding: '0 .3rem' }}>Error</span>
                        </div>
                      )}

                      {/* Remove button — only when pending/error */}
                      {(item.status === 'pending' || item.status === 'error') && (
                        <button
                          onClick={() => removeExtraImage(idx)}
                          style={{ position: 'absolute', top: '.25rem', right: '.25rem', background: 'rgba(0,0,0,.55)', border: 'none', color: 'white', borderRadius: '50%', width: '1.3rem', height: '1.3rem', fontSize: '.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                          title="Remove"
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Per-image colour — editable inline */}
                <div style={{ marginBottom: '.85rem' }}>
                  <label style={fieldLabel}>Colour per image (tap to edit)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                    {extraImages.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <img src={item.preview} alt="" style={{ width: '2.2rem', height: '2.2rem', borderRadius: '.4rem', objectFit: 'cover', flexShrink: 0 }} />
                        <input
                          value={item.colour}
                          onChange={e => setExtraColour(idx, e.target.value)}
                          placeholder={form.colour || 'e.g. Red'}
                          disabled={item.status === 'done' || item.status === 'uploading'}
                          style={{ ...inputStyle, flex: 1, fontSize: '.85rem', padding: '.45rem .7rem',
                            opacity: (item.status === 'done' || item.status === 'uploading') ? .6 : 1 }}
                        />
                        <span style={{ fontSize: '.75rem', color: item.status === 'done' ? '#16a34a' : item.status === 'error' ? '#dc2626' : '#9ca3af', flexShrink: 0, minWidth: '3rem', textAlign: 'right' }}>
                          {item.status === 'done' ? '✅ Done' : item.status === 'error' ? '❌ Fail' : item.status === 'uploading' ? '⏳…' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {!allExtrasDone && (
                  <button
                    onClick={handleUploadExtras}
                    disabled={uploadingExtras}
                    style={{ ...btnPrimary, background: '#4338ca', opacity: uploadingExtras ? .7 : 1 }}>
                    {uploadingExtras
                      ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Uploading…</>
                      : `📤 Upload ${extraImages.filter(x => x.status !== 'done').length} Image${extraImages.filter(x => x.status !== 'done').length !== 1 ? 's' : ''}`
                    }
                  </button>
                )}

                {allExtrasDone && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '.65rem', padding: '.6rem .85rem', fontSize: '.82rem', color: '#15803d', fontWeight: 600 }}>
                    ✅ All {extraImages.length} extra image{extraImages.length !== 1 ? 's' : ''} uploaded successfully!
                  </div>
                )}
              </>
            )}

            {extraImages.length === 0 && (
              <div style={{ marginTop: '.75rem', textAlign: 'center', padding: '.75rem', background: '#f5f3ff', borderRadius: '.65rem', border: '1.5px dashed #c4b5fd' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '.2rem' }}>🖼️</div>
                <div style={{ fontSize: '.8rem', color: '#6d28d9', fontWeight: 600 }}>Add more angles, close-ups or colour variants</div>
                <div style={{ fontSize: '.72rem', color: '#9ca3af', marginTop: '.15rem' }}>Tap "+ Add Photos" above — select multiple at once</div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: AI Model Images ──────────────────────────────────── */}
        {step3Active && (
          <div style={{ ...card, background: 'linear-gradient(135deg,#fdf2f8,#fdf4ff)', border: `1.5px solid ${showModelGen ? '#d8b4fe' : '#e5e7eb'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
              <div style={stepBadge(showModelGen, savedModelIdxs.size > 0)}>{savedModelIdxs.size > 0 ? '✓' : '3'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#7e22ce' }}>✨ AI Model Images <span style={{ fontSize: '.75rem', fontWeight: 400, color: '#9ca3af' }}>(optional)</span></div>
                <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>Generate a model wearing this garment via Replicate</div>
              </div>
              <button
                onClick={() => setShowModelGen(v => !v)}
                style={{ padding: '.35rem .85rem', borderRadius: '2rem', border: '1.5px solid #d8b4fe', background: showModelGen ? '#7e22ce' : 'white', color: showModelGen ? 'white' : '#7e22ce', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {showModelGen ? '▲ Hide' : '▼ Open'}
              </button>
            </div>

            {showModelGen && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ ...fieldLabel, color: '#7e22ce' }}>Garment Description for Replicate</label>
                  <textarea
                    value={displayPrompt}
                    onChange={e => { setModelPrompt(e.target.value); setPromptTouched(true); }}
                    rows={4}
                    placeholder="Describe the garment so Replicate generates the right model image…"
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontSize: '.88rem' } as React.CSSProperties}
                  />
                  {!promptTouched && (
                    <div style={{ fontSize: '.72rem', color: '#9ca3af', marginTop: '.25rem' }}>✏️ Auto-filled from Vision results — edit freely</div>
                  )}
                  {promptTouched && (
                    <button onClick={() => { setModelPrompt(''); setPromptTouched(false); }}
                      style={{ fontSize: '.72rem', color: '#7e22ce', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '.25rem' }}>
                      ↺ Reset to auto
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ ...fieldLabel, color: '#7e22ce' }}>Photography Style</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                    {MODEL_STYLES.map(s => (
                      <button key={s.id} onClick={() => setModelStyle(s.id)}
                        style={{ textAlign: 'left', padding: '.5rem .85rem', borderRadius: '.6rem', cursor: 'pointer',
                          border: modelStyle === s.id ? '2px solid #7e22ce' : '1.5px solid #e5e7eb',
                          background: modelStyle === s.id ? '#faf5ff' : 'white',
                          color: modelStyle === s.id ? '#7e22ce' : '#374151',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{s.label}</span>
                        <span style={{ fontSize: '.75rem', color: '#9ca3af' }}>{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateModel}
                  disabled={generatingModel}
                  style={{ width: '100%', padding: '.9rem', borderRadius: '.75rem', border: 'none',
                    background: generatingModel ? '#c084fc' : 'linear-gradient(135deg,#7e22ce,#9d174d)',
                    color: 'white', fontSize: '.95rem', fontWeight: 700,
                    cursor: generatingModel ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                    opacity: generatingModel ? .85 : 1 }}>
                  {generatingModel
                    ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Generating (15–30s)…</>
                    : '🪄 Generate Model Images'}
                </button>

                {modelError && (
                  <div style={{ marginTop: '.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.6rem', padding: '.65rem .85rem', color: '#dc2626', fontSize: '.82rem' }}>❌ {modelError}</div>
                )}

                {modelImages.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#7e22ce', marginBottom: '.5rem' }}>Tap 💾 to save alongside the product photo:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                      {modelImages.map((img, idx) => {
                        const src      = img.url ?? (img.b64 ? `data:image/png;base64,${img.b64}` : null);
                        if (!src) return null;
                        const isSaved  = savedModelIdxs.has(idx);
                        const isSaving = savingModelIdx === idx;
                        return (
                          <div key={idx} style={{ position: 'relative', borderRadius: '.75rem', overflow: 'hidden', border: isSaved ? '2.5px solid #16a34a' : '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
                            <img src={src} alt={`Model ${idx + 1}`} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
                            <button
                              onClick={() => handleSaveModelImage(idx)}
                              disabled={isSaving || isSaved}
                              style={{ position: 'absolute', bottom: '.5rem', left: '.5rem', right: '.5rem',
                                padding: '.45rem', borderRadius: '.5rem', border: 'none',
                                background: isSaved ? 'rgba(22,163,74,.92)' : 'rgba(0,0,0,.65)',
                                color: 'white', fontWeight: 700, fontSize: '.78rem',
                                cursor: isSaved ? 'default' : 'pointer',
                                backdropFilter: 'blur(4px)' }}>
                              {isSaving ? '⏳ Saving…' : isSaved ? '✅ Saved!' : '💾 Save as Product Photo'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {savedModelIdxs.size > 0 && (
                      <div style={{ marginTop: '.6rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '.65rem', padding: '.6rem .85rem', fontSize: '.8rem', color: '#15803d', fontWeight: 600 }}>
                        ✅ {savedModelIdxs.size} model image{savedModelIdxs.size > 1 ? 's' : ''} saved alongside the product photo.
                      </div>
                    )}
                  </div>
                )}

                <button onClick={reset} style={{ ...btnSecondary, marginTop: '1rem' }}>📷 Scan Another Product</button>
              </div>
            )}

            {!showModelGen && step2Done && (
              <div style={{ marginTop: '.75rem', display: 'flex', gap: '.5rem' }}>
                <button onClick={() => setShowModelGen(true)} style={{ ...btnSecondary, flex: 1, borderColor: '#d8b4fe', color: '#7e22ce' }}>🪄 Generate Model Images</button>
                <button onClick={reset} style={{ padding: '.75rem 1rem', borderRadius: '.75rem', border: '1.5px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', whiteSpace: 'nowrap' }}>📷 New Scan</button>
              </div>
            )}
          </div>
        )}

        {!preview && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.85rem', marginTop: '1.5rem', lineHeight: 1.8 }}>
            <strong style={{ color: '#9d174d' }}>3-step workflow:</strong><br />
            📷 Photograph → 🤖 Vision scan → 💾 Save to inventory<br />
            <span style={{ color: '#c084fc' }}>✨ Then optionally generate AI model images</span>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
