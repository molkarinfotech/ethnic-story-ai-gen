'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type CategoryOption = { slug: string; label: string };
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
  detectedGender: 'women' | 'men' | 'kids' | 'unisex' | null;
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
  size: string;
  stockCount: number;
};

type ModelImage = { url: string | null; b64: string | null };

type ExtraImageItem = {
  file: File;
  preview: string;
  colour: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

// Quick-pick size options for new product form
const SIZE_QUICK_PICKS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', '6', '8', '10', '12', '14', '16'];
const SIZES            = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const GENDERS          = ['women', 'men', 'kids', 'unisex'];
const MODEL_STYLES     = [
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

async function srcToBase64(src: string): Promise<string | null> {
  try {
    if (src.startsWith('data:')) return src;
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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

  // ── Live categories from DB ──────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    fetch('/api/admin/categories', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((cats: CategoryOption[]) => {
        if (Array.isArray(cats)) setCategories(cats);
      })
      .catch(() => {});
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<FormState>({
    productId: '', productName: '', colour: '', size: '', stockCount: 1,
  });
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: '', category: '', gender: 'women', price: '', original_price: '',
    description: '', badge: '', size: '', stockCount: 1,
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
          gender:   data.detectedGender ?? p.gender,
        }));
      } else if (data.detectedGender) {
        setNewProduct(p => ({ ...p, gender: data.detectedGender! }));
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
    setNewProduct({ name: '', category: '', gender: 'women', price: '', original_price: '', description: '', badge: '', size: '', stockCount: 1 });
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

  /**
   * Create a brand-new product then immediately set its inventory.
   * NOTE: This flow does the image upload itself — we clear imageFile
   * afterwards so the outer "Save to product" button cannot re-upload it.
   */
  async function handleCreateProduct() {
    if (!newProduct.name.trim()) { setError('Product name is required'); return; }
    if (!newProduct.price)       { setError('Price is required');        return; }
    if (!imageFile)               { setError('No image to upload');      return; }
    setCreatingProduct(true); setError(null);

    const colourToSave = normaliseColour(form.colour);

    try {
      // 1. Create the product row
      const createRes  = await authFetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           newProduct.name.trim(),
          category:       newProduct.category || (categories[0]?.slug ?? 'uncategorised'),
          gender:         newProduct.gender || 'women',
          price:          parseFloat(newProduct.price),
          original_price: newProduct.original_price ? parseFloat(newProduct.original_price) : null,
          description:    newProduct.description || null,
          badge:          newProduct.badge || null,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error ?? 'Failed to create product');

      const productId = created.id as string;

      // 2. Upload the scanned image (once — clear imageFile so outer Save can't re-upload)
      const fd = new FormData();
      fd.append('image',      imageFile);
      fd.append('product_id', productId);
      fd.append('colour',     colourToSave);
      fd.append('sort_order', '0');
      const uploadRes  = await authFetch('/api/admin/scan-upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Image upload failed');

      // ✅ Clear imageFile so "Save to product" cannot upload the same photo again
      setImageFile(null);

      // 3. Set the initial inventory variant
      const sizeToUse = (newProduct.size || form.size || 'Free Size').trim();
      const stockRes  = await authFetch('/api/admin/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id:  productId,
          size:        sizeToUse,
          colour:      colourToSave,
          stock_count: newProduct.stockCount ?? 1,
        }),
      });
      const stockData = await stockRes.json();
      if (!stockRes.ok) throw new Error(stockData.error ?? 'Stock update failed');

      // 4. Update local state so the product is immediately selectable
      const newEntry: SuggestedProduct = {
        id:       productId,
        name:     newProduct.name.trim(),
        slug:     created.slug as string,
        category: newProduct.category,
      };
      setAllProducts(prev => [newEntry, ...prev]);
      setForm(f => ({ ...f, productId, productName: newProduct.name.trim(), size: sizeToUse }));
      setShowNewProduct(false);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreatingProduct(false);
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

  async function handleSaveModelImage(idx: number) {
    if (!form.productId) { setModelError('Select a product first'); return; }
    const img = modelImages[idx];
    if (!img) return;
    setSavingModelIdx(idx);
    try {
      let res: Response | null = null;
      if (img.url) {
        res = await authFetch('/api/admin/scan-model-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: form.productId,
            image_url:  img.url,
            colour:     normaliseColour(form.colour),
          }),
        });
        if (!res.ok) res = null;
      }
      if (!res) {
        const src = img.url ?? img.b64;
        if (!src) throw new Error('No image data available');
        const b64 = await srcToBase64(src);
        if (!b64) throw new Error('Could not load image');
        res = await authFetch('/api/admin/scan-model-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id:    form.productId,
            image_base64:  b64,
            colour:        normaliseColour(form.colour),
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSavedModelIdxs(prev => new Set(prev).add(idx));
    } catch (e: unknown) {
      setModelError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingModelIdx(null);
    }
  }

  const filtered = allProducts.filter(p =>
    !productSearch ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProduct = allProducts.find(p => p.id === form.productId);

  return (
    <main style={{ minHeight: '100vh', background: '#fdf2f8', padding: '1rem' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1.5rem' }}>📷</div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f2937', margin: 0 }}>Scan & Add</h1>
            <p style={{ fontSize: '.78rem', color: '#9ca3af', margin: 0 }}>Upload a photo to auto-detect product details</p>
          </div>
        </div>

        {/* Step 1: Upload */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1rem' }}>
            <div style={stepBadge(true, !!preview)}>1</div>
            <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#1f2937' }}>Upload photo</span>
          </div>

          {!preview ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed #fba4c0', borderRadius: '.75rem',
                padding: '2rem', textAlign: 'center', cursor: 'pointer',
                background: '#fdf2f8', transition: 'background .15s',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📸</div>
              <p style={{ color: '#9d174d', fontWeight: 600, margin: 0 }}>Tap to upload garment photo</p>
              <p style={{ color: '#9ca3af', fontSize: '.8rem', margin: '.25rem 0 0' }}>JPG, PNG, WEBP • Auto-detects colour, size & category</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: '.75rem', maxHeight: '240px', objectFit: 'cover' }} />
              <button
                onClick={reset}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,.55)', color: 'white', border: 'none',
                  borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                  fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onInputChange} style={{ display: 'none' }} />
        </div>

        {/* Analysing spinner */}
        {analysing && (
          <div style={{ ...card, textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔍</div>
            <p style={{ color: '#9d174d', fontWeight: 600, margin: 0 }}>Analysing image…</p>
            <p style={{ color: '#9ca3af', fontSize: '.8rem', margin: '.25rem 0 0' }}>Detecting colour, size & category</p>
          </div>
        )}

        {/* Vision result chips */}
        {visionResult && !analysing && (
          <div style={{ ...card, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {visionResult.detectedProductType && (
                <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.78rem', fontWeight: 600 }}>
                  🏷️ {visionResult.detectedProductType.type}
                </span>
              )}
              {visionResult.primaryColour && (
                <span style={{ background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.78rem', fontWeight: 600 }}>
                  🎨 {visionResult.primaryColour}
                </span>
              )}
              {visionResult.detectedSize && (
                <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.78rem', fontWeight: 600 }}>
                  📐 {visionResult.detectedSize}
                </span>
              )}
              {visionResult.detectedGender && (
                <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.78rem', fontWeight: 600 }}>
                  👤 {visionResult.detectedGender}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Product selection */}
        {preview && !analysing && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1rem' }}>
              <div style={stepBadge(true, !!form.productId)}>2</div>
              <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#1f2937' }}>Select product</span>
            </div>

            {!showNewProduct ? (
              <>
                <input
                  style={{ ...inputStyle, marginBottom: '.75rem' }}
                  placeholder="🔍 Search products…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
                {loadingProducts && <p style={{ color: '#9ca3af', fontSize: '.85rem', textAlign: 'center' }}>Loading products…</p>}
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '.75rem' }}>
                  {filtered.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setForm(f => ({ ...f, productId: p.id, productName: p.name }))}
                      style={{
                        padding: '.6rem .85rem', borderRadius: '.6rem', cursor: 'pointer',
                        background: form.productId === p.id ? '#fdf2f8' : 'transparent',
                        border: form.productId === p.id ? '1.5px solid #fba4c0' : '1.5px solid transparent',
                        marginBottom: '.35rem', transition: 'all .1s',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '.9rem', color: '#1f2937' }}>{p.name}</span>
                      <span style={{ fontSize: '.75rem', color: '#9ca3af', marginLeft: '.5rem' }}>{p.category}</span>
                    </div>
                  ))}
                  {!loadingProducts && filtered.length === 0 && (
                    <p style={{ color: '#9ca3af', fontSize: '.85rem', textAlign: 'center', padding: '.5rem' }}>No products found</p>
                  )}
                </div>
                <button onClick={() => setShowNewProduct(true)} style={btnSecondary}>✚ Create new product</button>
              </>
            ) : (
              // ── New product form ──────────────────────────────────────────
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
                  <span style={{ fontWeight: 700, color: '#9d174d', fontSize: '.9rem' }}>✨ New product</span>
                  <button onClick={() => setShowNewProduct(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '.85rem' }}>✕ Cancel</button>
                </div>

                <label style={fieldLabel}>Product name *</label>
                <input style={{ ...inputStyle, marginBottom: '.75rem' }} placeholder="Banarasi Silk Saree"
                  value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />

                <label style={fieldLabel}>Category *</label>
                <select
                  style={{ ...selectStyle, marginBottom: '.75rem' }}
                  value={newProduct.category}
                  onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                >
                  {categories.length === 0 && <option value="">Loading…</option>}
                  {categories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>

                <label style={fieldLabel}>Gender</label>
                <select style={{ ...selectStyle, marginBottom: '.75rem' }}
                  value={newProduct.gender}
                  onChange={e => setNewProduct(p => ({ ...p, gender: e.target.value }))}>
                  {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
                  <div>
                    <label style={fieldLabel}>Price (AUD) *</label>
                    <input style={inputStyle} type="number" placeholder="189" min="0" step="0.01"
                      value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} />
                  </div>
                  <div>
                    <label style={fieldLabel}>Original price</label>
                    <input style={inputStyle} type="number" placeholder="229" min="0" step="0.01"
                      value={newProduct.original_price} onChange={e => setNewProduct(p => ({ ...p, original_price: e.target.value }))} />
                  </div>
                </div>

                {/* ── Size: free-text input + quick-pick pills ─────────── */}
                <label style={fieldLabel}>Initial size *</label>
                <input
                  style={{ ...inputStyle, marginBottom: '.5rem' }}
                  placeholder="e.g. M, XL, Free Size, 10, 42…"
                  value={newProduct.size || form.size || ''}
                  onChange={e => setNewProduct(p => ({ ...p, size: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
                  {SIZE_QUICK_PICKS.map(s => (
                    <button
                      key={s}
                      type="button"
                      style={{
                        ...pill((newProduct.size || form.size || '') === s),
                        padding: '.25rem .65rem',
                        fontSize: '.75rem',
                      }}
                      onClick={() => setNewProduct(p => ({ ...p, size: s }))}
                    >{s}</button>
                  ))}
                </div>

                {/* Initial stock */}
                <label style={fieldLabel}>Initial stock</label>
                <input style={{ ...inputStyle, marginBottom: '.75rem' }} type="number" min="0" placeholder="1"
                  value={newProduct.stockCount ?? 1}
                  onChange={e => setNewProduct(p => ({ ...p, stockCount: parseInt(e.target.value) || 0 }))} />

                <label style={fieldLabel}>Description</label>
                <div style={{ position: 'relative', marginBottom: '.75rem' }}>
                  <textarea
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' } as React.CSSProperties}
                    placeholder="Rich fabric with intricate embroidery…"
                    value={newProduct.description}
                    onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDesc}
                    style={{
                      position: 'absolute', bottom: '8px', right: '8px',
                      background: '#7c3aed', color: 'white', border: 'none',
                      borderRadius: '.45rem', padding: '.3rem .65rem',
                      fontSize: '.75rem', fontWeight: 700, cursor: 'pointer',
                      opacity: generatingDesc ? .6 : 1,
                    }}
                  >{generatingDesc ? '⏳' : '✨ AI'}</button>
                </div>
                {descError && <p style={{ color: '#dc2626', fontSize: '.8rem', marginBottom: '.5rem' }}>{descError}</p>}

                <button
                  onClick={handleCreateProduct}
                  disabled={creatingProduct}
                  style={{ ...btnPrimary, opacity: creatingProduct ? .7 : 1 }}
                >
                  {creatingProduct ? '⏳ Creating…' : '✅ Create & save product'}
                </button>
              </div>
            )}

            {selectedProduct && !showNewProduct && (
              <div style={{ marginTop: '.75rem', padding: '.6rem .85rem', background: '#f0fdf4', borderRadius: '.6rem', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '.82rem', color: '#166534', fontWeight: 600 }}>✓ Selected: {selectedProduct.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Colour / Size / Stock */}
        {form.productId && !showNewProduct && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1rem' }}>
              <div style={stepBadge(true, !!(form.colour && form.size))}>3</div>
              <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#1f2937' }}>Colour, size & stock</span>
            </div>

            <label style={fieldLabel}>Colour</label>
            <input style={{ ...inputStyle, marginBottom: '.75rem' }} placeholder="e.g. Deep Red"
              value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} />

            <label style={fieldLabel}>Size *</label>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
              {SIZES.map(s => (
                <button key={s} style={pill(form.size === s)} onClick={() => setForm(f => ({ ...f, size: s }))}>{s}</button>
              ))}
            </div>

            <label style={fieldLabel}>Stock quantity</label>
            <input style={{ ...inputStyle, marginBottom: '.25rem' }} type="number" min="0" placeholder="1"
              value={form.stockCount}
              onChange={e => setForm(f => ({ ...f, stockCount: parseInt(e.target.value) || 0 }))} />
          </div>
        )}

        {/* Extra images */}
        {form.productId && !showNewProduct && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.85rem' }}>
              <div style={stepBadge(false, extraUploadDone)}>4</div>
              <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#1f2937' }}>Extra images <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '.8rem' }}>(optional)</span></span>
            </div>

            <button onClick={() => extraFileRef.current?.click()} style={btnSecondary}>📎 Add more photos</button>
            <input ref={extraFileRef} type="file" accept="image/*" multiple onChange={onExtraFilesChange} style={{ display: 'none' }} />

            {extraImages.length > 0 && (
              <>
                <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {extraImages.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '.65rem', alignItems: 'center', padding: '.5rem', background: '#f9fafb', borderRadius: '.6rem' }}>
                      <img src={item.preview} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          style={{ ...inputStyle, fontSize: '.8rem', padding: '.4rem .65rem' }}
                          placeholder="Colour (e.g. Gold)"
                          value={item.colour}
                          onChange={e => setExtraColour(idx, e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', flexShrink: 0 }}>
                        {item.status === 'uploading' && <span style={{ fontSize: '.75rem', color: '#9ca3af' }}>⏳</span>}
                        {item.status === 'done'      && <span style={{ fontSize: '.75rem', color: '#16a34a' }}>✓</span>}
                        {item.status === 'error'     && <span style={{ fontSize: '.75rem', color: '#dc2626' }} title={item.error}>✗</span>}
                        <button onClick={() => removeExtraImage(idx)}
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '.85rem' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUploadExtras}
                  disabled={uploadingExtras || extraImages.every(i => i.status === 'done')}
                  style={{ ...btnSecondary, marginTop: '.75rem', opacity: uploadingExtras ? .7 : 1 }}
                >
                  {uploadingExtras ? '⏳ Uploading…' : extraUploadDone ? '✓ All uploaded' : `⬆ Upload ${extraImages.filter(i => i.status !== 'done').length} photo(s)`}
                </button>
              </>
            )}
          </div>
        )}

        {/* AI Model generation */}
        {form.productId && !showNewProduct && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <div style={stepBadge(false, savedModelIdxs.size > 0)}>5</div>
                <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#1f2937' }}>AI model photo</span>
              </div>
              <button
                onClick={() => setShowModelGen(v => !v)}
                style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '.5rem', padding: '.3rem .7rem', fontSize: '.8rem', color: '#374151', cursor: 'pointer' }}
              >{showModelGen ? '▲ Hide' : '▼ Show'}</button>
            </div>

            {showModelGen && (
              <>
                <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.85rem' }}>
                  {MODEL_STYLES.map(s => (
                    <button key={s.id} style={pill(modelStyle === s.id)} onClick={() => setModelStyle(s.id)} title={s.desc}>{s.label}</button>
                  ))}
                </div>

                <label style={fieldLabel}>Custom prompt <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical', marginBottom: '.75rem', fontSize: '.85rem' } as React.CSSProperties}
                  placeholder={buildDefaultPrompt(visionResult, form)}
                  value={promptTouched ? modelPrompt : ''}
                  onChange={e => { setModelPrompt(e.target.value); setPromptTouched(true); }}
                  onFocus={() => { if (!promptTouched) setModelPrompt(buildDefaultPrompt(visionResult, form)); }}
                />

                <button onClick={handleGenerateModel} disabled={generatingModel} style={{ ...btnSecondary, marginBottom: '.85rem', opacity: generatingModel ? .7 : 1 }}>
                  {generatingModel ? '⏳ Generating…' : '🤖 Generate model photo'}
                </button>

                {modelError && <p style={{ color: '#dc2626', fontSize: '.82rem', marginBottom: '.5rem' }}>⚠ {modelError}</p>}

                {modelImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                    {modelImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        {img.url && (
                          <img src={img.url} alt={`Model ${idx + 1}`}
                            style={{ width: '100%', borderRadius: '.65rem', aspectRatio: '3/4', objectFit: 'cover' }} />
                        )}
                        <button
                          onClick={() => handleSaveModelImage(idx)}
                          disabled={savingModelIdx === idx || savedModelIdxs.has(idx)}
                          style={{
                            position: 'absolute', bottom: '8px', right: '8px',
                            background: savedModelIdxs.has(idx) ? '#16a34a' : '#9d174d',
                            color: 'white', border: 'none', borderRadius: '.45rem',
                            padding: '.3rem .65rem', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer',
                            opacity: savingModelIdx === idx ? .7 : 1,
                          }}
                        >
                          {savingModelIdx === idx ? '⏳' : savedModelIdxs.has(idx) ? '✓ Saved' : '💾 Save'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 6: Save */}
        {form.productId && !showNewProduct && (
          <div style={{ marginBottom: '2rem' }}>
            {error  && <p style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.6rem', padding: '.6rem .85rem', fontSize: '.85rem', marginBottom: '.75rem' }}>⚠ {error}</p>}
            {saved  && <p style={{ color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '.6rem', padding: '.6rem .85rem', fontSize: '.85rem', marginBottom: '.75rem' }}>✅ Saved successfully!</p>}
            <button onClick={handleSave} disabled={saving || !imageFile} style={{ ...btnPrimary, opacity: (saving || !imageFile) ? .7 : 1 }}>
              {saving ? '⏳ Saving…' : imageFile ? '💾 Save to product' : '✅ Product created'}
            </button>
            <button onClick={reset} style={{ ...btnSecondary, marginTop: '.65rem' }}>🔄 Scan another item</button>
          </div>
        )}

      </div>
    </main>
  );
}
