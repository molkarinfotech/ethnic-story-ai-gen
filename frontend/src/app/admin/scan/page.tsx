'use client';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SuggestedProduct = { id: string; name: string; slug: string; category: string };

type VisionResult = {
  visionSkipped: boolean;
  visionError: string | null;
  labels: string[];
  objectNames?: string[];
  webLabels?: string[];
  detectedCategory: string | null;
  detectedProductType: { type: string; category: string } | null;
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
  gender: string;
  price: string;
  original_price: string;
  description: string;
  badge: string;
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
const GENDERS    = ['women', 'men', 'kids', 'unisex'];
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

function normaliseColour(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Unassigned';
  return trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function buildDefaultPrompt(visionResult: VisionResult | null, form: FormState): string {
  const parts: string[] = [];
  if (form.colour)                                    parts.push(form.colour);
  if (visionResult?.detectedProductType?.type)        parts.push(visionResult.detectedProductType.type);
  else if (visionResult?.detectedCategory)            parts.push(visionResult.detectedCategory);
  if (visionResult?.labels?.length)                   parts.push(visionResult.labels.slice(0, 4).join(', '));
  if (form.productName)                               parts.push(form.productName);
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
    name: '', category: '', gender: 'women', price: '', original_price: '', description: '', badge: '',
  });

  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [descError,      setDescError]      = useState<string | null>(null);

  const [extraImages,     setExtraImages]     = useState<ExtraImageItem[]>([]);
  const [uploadingExtras, setUploadingExtras] = useState(false);
  const [extraUploadDone, setExtraUploadDone] = useState(false);

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
    setDescError(null);
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
      if (data.detectedProductType) {
        setNewProduct(p => ({
          ...p,
          name:     p.name     || `${data.primaryColour ? data.primaryColour + ' ' : ''}${data.detectedProductType!.type}`,
          category: p.category || data.detectedProductType!.category,
        }));
      }
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

  function onExtraFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const items: ExtraImageItem[] = files.map(f => ({
      file: f, preview: URL.createObjectURL(f), colour: form.colour || '', status: 'pending',
    }));
    setExtraImages(prev => [...prev, ...items]);
    setExtraUploadDone(false);
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
    let sortOrder = 1;
    for (let i = 0; i < extraImages.length; i++) {
      const item = extraImages[i];
      if (item.status === 'done') { sortOrder++; continue; }
      setExtraImages(prev => prev.map((x, idx) => idx === i ? { ...x, status: 'uploading' } : x));
      try {
        const fd = new FormData();
        fd.append('image', item.file);
        fd.append('product_id', form.productId);
        fd.append('colour', normaliseColour(item.colour || form.colour || ''));
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
    setNewProduct({ name: '', category: '', gender: 'women', price: '', original_price: '', description: '', badge: '' });
    setShowModelGen(false); setModelImages([]); setModelError(null);
    setSavedModelIdxs(new Set()); setModelPrompt(''); setPromptTouched(false);
    setExtraImages([]); setExtraUploadDone(false);
    setDescError(null); setGeneratingDesc(false);
    if (fileRef.current) fileRef.current.value = '';
    if (extraFileRef.current) extraFileRef.current.value = '';
  }

  async function handleGenerateDescription() {
    setGeneratingDesc(true); setDescError(null);
    try {
      const res = await authFetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels:      visionResult?.labels ?? [],
          colour:      normaliseColour(form.colour),
          productType: visionResult?.detectedProductType?.type ?? visionResult?.detectedCategory ?? '',
          productName: newProduct.name || form.productName || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setNewProduct(p => ({ ...p, description: data.description }));
    } catch (e: unknown) {
      setDescError(e instanceof Error ? e.message : 'Failed to generate description');
    } finally {
      setGeneratingDesc(false);
    }
  }

  async function handleSave() {
    if (!form.productId) { setError('Please select a product'); return; }
    if (!form.size)      { setError('Please select a size');    return; }
    if (!imageFile)      { setError('No image to upload');      return; }
    setSaving(true); setError(null);

    const colourToSave = normaliseColour(form.colour);
    try {
      const fd = new FormData();
      fd.append('image',      imageFile);
      fd.append('product_id', form.productId);
      fd.append('colour',     colourToSave);
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
          colour:      colourToSave,
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

  async function handleGenerateModel() {
    setGeneratingModel(true); setModelError(null); setModelImages([]); setSavedModelIdxs(new Set());
    try {
      const fd = new FormData();
      fd.append('style',  modelStyle);
      fd.append('prompt', promptTouched ? modelPrompt : buildDefaultPrompt(visionResult, form));
      if (imageFile) fd.append('image', imageFile);
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

  // Save model image via server-side proxy route to avoid browser CORS on Replicate CDN URLs
  async function handleSaveModelImage(idx: number) {
    if (!form.productId) {
      setModelError('Select a product first before saving a model image.');
      return;
    }
    const img = modelImages[idx];
    if (!img.url && !img.b64) return;

    setSavingModelIdx(idx); setModelError(null);
    try {
      if (img.url) {
        // Server-side fetch + upload — bypasses CORS on Replicate CDN
        const res = await authFetch('/api/admin/scan-model-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url:  img.url,
            product_id: form.productId,
            colour:     normaliseColour(form.colour),
            size:       form.size || undefined,
            sort_order: idx + 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Save failed');
      } else {
        // b64 path — upload as file via scan-upload (no CORS issue)
        const binary = atob(img.b64!);
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
        const blob = new Blob([arr], { type: 'image/png' });
        const file = new File([blob], `model-gen-${Date.now()}.png`, { type: 'image/png' });
        const fd = new FormData();
        fd.append('image',      file);
        fd.append('product_id', form.productId);
        fd.append('colour',     normaliseColour(form.colour));
        fd.append('sort_order', String(idx + 1));
        const res  = await authFetch('/api/admin/scan-upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      }
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
        gender:   newProduct.gender || 'women',
        price:    parseFloat(newProduct.price),
        in_stock: true,
      };
      if (newProduct.original_price) body.original_price = parseFloat(newProduct.original_price);
      if (newProduct.description)    body.description    = newProduct.description.trim();
      if (newProduct.badge?.trim())  body.badge          = newProduct.badge.trim();
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
      setNewProduct({ name: '', category: '', gender: 'women', price: '', original_price: '', description: '', badge: '' });
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
                  <div style={{ fontWeight: 700, fontSize: '.8rem', color: '#15803d', marginBottom: '.4rem' }}>🤖 Detected — tap a chip to apply it:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                    {/* Clickable colour chips */}
                    {visionResult.detectedColours.map(c => (
                      <button key={c.name}
                        title="Tap to use this colour"
                        onClick={() => setForm(f => ({ ...f, colour: c.name }))}
                        style={{ background: form.colour === c.name ? '#9d174d' : '#dcfce7', color: form.colour === c.name ? 'white' : '#166534', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 600, border: form.colour === c.name ? '2px solid #9d174d' : '1px solid #bbf7d0', cursor: 'pointer' }}>
                        🎨 {c.name}
                      </button>
                    ))}
                    {/* Clickable product type chip — fills in new product name/category */}
                    {visionResult.detectedProductType && (
                      <button
                        title="Tap to set product type"
                        onClick={() => {
                          setNewProduct(p => ({ ...p, category: visionResult.detectedProductType!.category, name: p.name || visionResult.detectedProductType!.type }));
                          setShowNewProduct(true);
                        }}
                        style={{ background: '#fef3c7', color: '#92400e', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 700, border: '1px solid #fde68a', cursor: 'pointer' }}>
                        👗 {visionResult.detectedProductType.type}
                      </button>
                    )}
                    {visionResult.detectedCategory && !visionResult.detectedProductType && (
                      <button
                        title="Tap to set category"
                        onClick={() => setNewProduct(p => ({ ...p, category: visionResult.detectedCategory! }))}
                        style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 600, border: '1px solid #ddd6fe', cursor: 'pointer' }}>
                        📂 {visionResult.detectedCategory}
                      </button>
                    )}
                    {visionResult.detectedSize && (
                      <button
                        title="Tap to use this size"
                        onClick={() => setForm(f => ({ ...f, size: visionResult.detectedSize! }))}
                        style={{ background: form.size === visionResult.detectedSize ? '#1d4ed8' : '#dbeafe', color: form.size === visionResult.detectedSize ? 'white' : '#1d4ed8', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 600, border: '1px solid #bfdbfe', cursor: 'pointer' }}>
                        📏 {visionResult.detectedSize}
                      </button>
                    )}
                    {/* Web detection labels */}
                    {(visionResult.webLabels ?? []).slice(0, 4).map(l => (
                      <span key={l} style={{ background: '#f0f9ff', color: '#0369a1', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem', border: '1px solid #bae6fd' }}>🌐 {l}</span>
                    ))}
                    {/* Standard Vision labels */}
                    {visionResult.labels.slice(0, 4).map(l => (
                      <span key={l} style={{ background: '#f3f4f6', color: '#374151', borderRadius: '.4rem', padding: '.15rem .5rem', fontSize: '.75rem' }}>{l}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── STEP 2 ──────────────────────────────────────────────────── */}
        {showForm && (
          <div style={{ ...card, border: step2Done ? '1.5px solid #bbf7d0' : '1.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '1rem' }}>
              <div style={stepBadge(!step2Done, step2Done)}>{step2Done ? '✓' : '2'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem', color: step2Done ? '#15803d' : '#111827' }}>Add to Inventory</div>
                <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>Select product, colour &amp; size — stock tracked per variant</div>
              </div>
            </div>

            {!saved && (
              <>
                <label style={fieldLabel}>Product</label>
                <input
                  style={{ ...inputStyle, marginBottom: '.5rem' }}
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
                {loadingProducts && <div style={{ fontSize: '.8rem', color: '#9ca3af', marginBottom: '.5rem' }}>Loading products…</div>}

                {suggestedProds.length > 0 && (
                  <div style={{ marginBottom: '.5rem' }}>
                    <div style={{ fontSize: '.75rem', color: '#9ca3af', marginBottom: '.3rem' }}>AI Suggestions:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                      {suggestedProds.map(p => (
                        <button key={p.id} onClick={() => { setForm(f => ({ ...f, productId: p.id, productName: p.name })); setProductSearch(''); }}
                          style={{ ...pill(form.productId === p.id), fontSize: '.78rem' }}>{p.name}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1.5px solid #e5e7eb', borderRadius: '.65rem', marginBottom: '.75rem' }}>
                  {filteredProds.length === 0 ? (
                    <div style={{ padding: '.85rem', color: '#9ca3af', fontSize: '.85rem', textAlign: 'center' }}>No products found</div>
                  ) : filteredProds.map(p => (
                    <button key={p.id}
                      onClick={() => { setForm(f => ({ ...f, productId: p.id, productName: p.name })); setProductSearch(''); }}
                      style={{ width: '100%', textAlign: 'left', padding: '.65rem .85rem', border: 'none', borderBottom: '1px solid #f3f4f6', background: form.productId === p.id ? '#fdf2f8' : 'white', cursor: 'pointer', fontSize: '.88rem', color: form.productId === p.id ? '#9d174d' : '#1f2937', fontWeight: form.productId === p.id ? 700 : 400 }}>
                      {p.name} <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{p.category}</span>
                    </button>
                  ))}
                </div>

                <button onClick={() => setShowNewProduct(v => !v)} style={{ ...btnSecondary, marginBottom: '.75rem' }}>
                  {showNewProduct ? '✕ Cancel' : '＋ New Product'}
                </button>

                {showNewProduct && (
                  <div style={{ background: '#fdf2f8', borderRadius: '.85rem', padding: '1rem', marginBottom: '.75rem', border: '1px solid #fbcfe8' }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.75rem', color: '#9d174d' }}>✨ New Product</div>

                    <label style={fieldLabel}>Name *</label>
                    <input style={{ ...inputStyle, marginBottom: '.5rem' }} value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Banarasi Silk Saree" />

                    <label style={fieldLabel}>Category *</label>
                    <select style={{ ...selectStyle, marginBottom: '.5rem' }} value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}>
                      <option value="">Select category…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <label style={fieldLabel}>Gender</label>
                    <select style={{ ...selectStyle, marginBottom: '.5rem' }} value={newProduct.gender} onChange={e => setNewProduct(p => ({ ...p, gender: e.target.value }))}>
                      {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                    </select>

                    <label style={fieldLabel}>Badge <span style={{ fontWeight: 400, textTransform: 'none', color: '#9ca3af' }}>(optional — e.g. New, Sale, Bestseller)</span></label>
                    <input style={{ ...inputStyle, marginBottom: '.5rem' }} value={newProduct.badge} onChange={e => setNewProduct(p => ({ ...p, badge: e.target.value }))} placeholder="e.g. New Arrival" />

                    <label style={fieldLabel}>Price (AUD) *</label>
                    <input style={{ ...inputStyle, marginBottom: '.5rem' }} type="number" min="0" step="0.01" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 149.00" />

                    <label style={fieldLabel}>Original Price (AUD)</label>
                    <input style={{ ...inputStyle, marginBottom: '.5rem' }} type="number" min="0" step="0.01" value={newProduct.original_price} onChange={e => setNewProduct(p => ({ ...p, original_price: e.target.value }))} placeholder="e.g. 199.00" />

                    <label style={fieldLabel}>Description</label>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', marginBottom: '.35rem' }}
                        value={newProduct.description}
                        onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                        placeholder="Rich product description…"
                      />
                      <button
                        onClick={handleGenerateDescription}
                        disabled={generatingDesc}
                        style={{ fontSize: '.75rem', padding: '.3rem .7rem', borderRadius: '.5rem', border: '1px solid #9d174d', background: generatingDesc ? '#fdf2f8' : 'white', color: '#9d174d', cursor: generatingDesc ? 'wait' : 'pointer', fontWeight: 600, marginBottom: '.25rem' }}>
                        {generatingDesc ? '✨ Generating…' : '✨ Auto-write with GPT'}
                      </button>
                      {descError && <div style={{ fontSize: '.75rem', color: '#dc2626', marginBottom: '.25rem' }}>{descError}</div>}
                    </div>

                    <button onClick={handleCreateProduct} disabled={creatingProduct} style={{ ...btnPrimary, marginTop: '.25rem' }}>
                      {creatingProduct ? 'Creating…' : '✓ Create Product'}
                    </button>
                  </div>
                )}

                {/* Colour */}
                <label style={fieldLabel}>Colour</label>
                <input style={{ ...inputStyle, marginBottom: '.75rem' }} value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} placeholder="e.g. Red, Deep Blue…" />

                {/* Size */}
                <label style={fieldLabel}>Size *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.75rem' }}>
                  {SIZES.map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, size: s }))} style={pill(form.size === s)}>{s}</button>
                  ))}
                </div>

                {/* Stock count */}
                <label style={fieldLabel}>Stock Count</label>
                <input style={{ ...inputStyle, marginBottom: '.75rem' }} type="number" min="0" value={form.stockCount} onChange={e => setForm(f => ({ ...f, stockCount: Number(e.target.value) }))} />
              </>
            )}

            {saved && (
              <div style={{ background: '#f0fdf4', borderRadius: '.75rem', padding: '.85rem 1rem', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#15803d', fontSize: '.9rem' }}>Saved to inventory!</div>
                  <div style={{ fontSize: '.78rem', color: '#16a34a' }}>{form.productName} · {normaliseColour(form.colour)} · {form.size} · {form.stockCount} units</div>
                </div>
              </div>
            )}

            {form.productId && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '.75rem', marginTop: '.25rem' }}>
                <label style={fieldLabel}>Additional Images (same or other colours)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.5rem' }}>
                  {extraImages.map((item, i) => (
                    <div key={i} style={{ position: 'relative', width: '72px' }}>
                      <img src={item.preview} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '.5rem', border: `2px solid ${item.status === 'done' ? '#bbf7d0' : item.status === 'error' ? '#fca5a5' : '#e5e7eb'}` }} />
                      {item.status === 'uploading' && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.6)', borderRadius: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem' }}>⏳</div>}
                      {item.status === 'done'      && <div style={{ position: 'absolute', top: 2, right: 2, background: '#16a34a', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
                      {item.status !== 'done' && (
                        <>
                          <input
                            style={{ width: '72px', fontSize: '.65rem', padding: '.2rem .3rem', border: '1px solid #e5e7eb', borderRadius: '.3rem', marginTop: '.2rem' }}
                            value={item.colour} onChange={e => setExtraColour(i, e.target.value)}
                            placeholder="Colour"
                          />
                          <button onClick={() => removeExtraImage(i)} style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(0,0,0,.5)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </>
                      )}
                    </div>
                  ))}
                  <div onClick={() => extraFileRef.current?.click()}
                    style={{ width: '72px', height: '72px', border: '2px dashed #e9a8c8', borderRadius: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.5rem', color: '#e9a8c8' }}>
                    +
                    <input ref={extraFileRef} type="file" accept="image/*" multiple onChange={onExtraFilesChange} style={{ display: 'none' }} />
                  </div>
                </div>
                {extraImages.some(x => x.status === 'pending' || x.status === 'error') && (
                  <button onClick={handleUploadExtras} disabled={uploadingExtras} style={{ ...btnSecondary, marginBottom: '.5rem' }}>
                    {uploadingExtras ? '⏳ Uploading…' : `⬆️ Upload ${extraImages.filter(x => x.status !== 'done').length} image(s)`}
                  </button>
                )}
                {allExtrasDone && <div style={{ fontSize: '.8rem', color: '#16a34a', fontWeight: 600 }}>✓ All extra images uploaded</div>}
              </div>
            )}

            {!saved && (
              <>
                {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '.65rem', padding: '.65rem .85rem', color: '#dc2626', fontSize: '.85rem', marginBottom: '.75rem' }}>{error}</div>}
                <button onClick={handleSave} disabled={saving || !form.productId || !form.size} style={{ ...btnPrimary, opacity: saving || !form.productId || !form.size ? .5 : 1 }}>
                  {saving ? '⏳ Saving…' : '✓ Save to Inventory'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Model gen ────────────────────────────────────────── */}
        {step3Active && (
          <div style={{ ...card, border: '1.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '1rem' }}>
              <div style={stepBadge(true, false)}>3</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Generate Model Image</div>
                <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>AI dresses a virtual model in your scanned garment</div>
              </div>
              <button onClick={() => setShowModelGen(v => !v)} style={{ marginLeft: 'auto', ...pill(showModelGen) }}>
                {showModelGen ? 'Hide' : 'Open'}
              </button>
            </div>

            {showModelGen && (
              <>
                <label style={fieldLabel}>Style</label>
                <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
                  {MODEL_STYLES.map(s => (
                    <button key={s.id} onClick={() => setModelStyle(s.id)} style={{ ...pill(modelStyle === s.id), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '.1rem', padding: '.4rem .75rem' }}>
                      <span>{s.label}</span>
                      <span style={{ fontSize: '.68rem', color: '#9ca3af', fontWeight: 400 }}>{s.desc}</span>
                    </button>
                  ))}
                </div>

                <label style={fieldLabel}>Prompt</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', marginBottom: '.75rem', fontSize: '.85rem' }}
                  value={displayPrompt}
                  onChange={e => { setModelPrompt(e.target.value); setPromptTouched(true); }}
                />

                {imageFile && (
                  <div style={{ fontSize: '.75rem', color: '#16a34a', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    <span>🖼️</span>
                    <span>Scanned image used as garment reference for AI generation</span>
                  </div>
                )}

                <button onClick={handleGenerateModel} disabled={generatingModel} style={{ ...btnPrimary, marginBottom: '.75rem', opacity: generatingModel ? .6 : 1 }}>
                  {generatingModel ? '✨ Generating…' : '✨ Generate Model Image'}
                </button>

                {modelError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '.65rem', padding: '.65rem', color: '#dc2626', fontSize: '.85rem', marginBottom: '.75rem' }}>{modelError}</div>}

                {modelImages.length > 0 && (
                  <>
                    <div style={{ fontSize: '.75rem', color: '#6b7280', marginBottom: '.5rem' }}>Tap ⬆️ Save to add a generated image to this product variant</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem' }}>
                      {modelImages.map((img, i) => {
                        const src = img.url ?? (img.b64 ? `data:image/png;base64,${img.b64}` : null);
                        if (!src) return null;
                        return (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={src} alt={`Generated ${i+1}`} style={{ width: '100%', borderRadius: '.75rem', display: 'block' }} />
                            <button
                              onClick={() => handleSaveModelImage(i)}
                              disabled={savedModelIdxs.has(i) || savingModelIdx === i}
                              style={{ position: 'absolute', bottom: '.5rem', right: '.5rem', background: savedModelIdxs.has(i) ? '#16a34a' : '#9d174d', color: 'white', border: 'none', borderRadius: '2rem', padding: '.3rem .75rem', fontSize: '.75rem', cursor: 'pointer', fontWeight: 700, opacity: savingModelIdx === i ? .6 : 1 }}>
                              {savedModelIdxs.has(i) ? '✓ Saved' : savingModelIdx === i ? '⏳' : '⬆️ Save'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
