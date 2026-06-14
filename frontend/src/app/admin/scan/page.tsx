'use client';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type DetectedColour = { name: string; score: number; pixelFraction: number };
type SuggestedProduct = { id: string; name: string; slug: string; category: string; image?: string };

type AnalysisResult = {
  visionSkipped: boolean;
  visionError: string | null;
  labels: string[];
  detectedCategory: string | null;
  detectedColours: DetectedColour[];
  primaryColour: string | null;
  detectedSize: string | null;
  suggestedProducts: SuggestedProduct[];
};

type FormState = {
  productId: string;
  productName: string;
  colour: string;
  size: string;
  stockCount: number;
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

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
  borderRadius: '.65rem', fontSize: '.95rem', boxSizing: 'border-box',
  background: 'white',
};
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '1rem', borderRadius: '.75rem', border: 'none',
  background: '#9d174d', color: 'white', fontSize: '1rem', fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
};

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview,   setPreview]   = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysis,  setAnalysis]  = useState<AnalysisResult | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    productId: '', productName: '', colour: '', size: '', stockCount: 1,
  });

  const handleFile = useCallback(async (file: File) => {
    setError(null); setAnalysis(null); setSaved(false);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setAnalysing(true);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetch('/api/admin/scan-analyse', { method: 'POST', body: fd });
      const data: AnalysisResult = await res.json();

      if (!res.ok) throw new Error((data as any).error ?? 'Analysis failed');

      setAnalysis(data);
      setForm(f => ({
        ...f,
        colour:      data.primaryColour ?? f.colour,
        size:        data.detectedSize  ?? f.size,
        productId:   data.suggestedProducts?.[0]?.id   ?? f.productId,
        productName: data.suggestedProducts?.[0]?.name ?? f.productName,
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalysing(false);
    }
  }, []);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setPreview(null); setImageFile(null); setAnalysis(null);
    setSaved(false); setError(null);
    setForm({ productId: '', productName: '', colour: '', size: '', stockCount: 1 });
    if (fileRef.current) fileRef.current.value = '';
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
      const uploadRes  = await fetch('/api/admin/scan-upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed');

      const stockRes  = await fetch('/api/admin/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: form.productId, size: form.size, colour: form.colour, stock_count: form.stockCount }),
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

  const showForm = analysis !== null && !analysing;

  return (
    <div style={{ minHeight: '100dvh', background: '#fdf2f8', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: '#9d174d', color: 'white', padding: '.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>📷 Inventory Scanner</span>
        </div>
        <span style={{ fontSize: '.75rem', opacity: .7 }}>Google Vision</span>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1rem' }}>

        {/* Camera picker */}
        {!preview && (
          <div
            onClick={() => fileRef.current?.click()}
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
            <img src={preview} alt="Scanned garment" style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }} />

            {/* Analysing overlay */}
            {analysing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '.75rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Analysing image…</div>
              </div>
            )}

            {/* Saved overlay */}
            {saved && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '.5rem' }}>
                <div style={{ fontSize: '3rem' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Saved to Inventory!</div>
              </div>
            )}

            {!analysing && !saved && (
              <button onClick={reset} style={{ position: 'absolute', top: '.6rem', right: '.6rem', background: 'rgba(0,0,0,.5)', color: 'white', border: 'none', borderRadius: '2rem', padding: '.3rem .75rem', fontSize: '.8rem', cursor: 'pointer' }}>
                ↺ Retake
              </button>
            )}
          </div>
        )}

        {/* Vision warning (non-fatal) */}
        {analysis?.visionSkipped && analysis.visionError && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '.75rem', padding: '.75rem 1rem', color: '#92400e', fontSize: '.8rem', marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <div>
              <strong>Vision AI unavailable</strong> — {analysis.visionError}<br/>
              <span style={{ opacity: .8 }}>You can still fill in the form manually below.</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.75rem', padding: '.85rem 1rem', color: '#dc2626', fontSize: '.875rem', marginBottom: '1rem' }}>
            ❌ {error}
          </div>
        )}

        {/* AI detections summary */}
        {showForm && !analysis.visionSkipped && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: '.6rem', color: '#6b7280', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>🤖 AI Detected</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
              {analysis.detectedCategory && (
                <span style={{ background: '#fdf2f8', color: '#9d174d', border: '1px solid #fbcfe8', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.8rem', fontWeight: 600 }}>📂 {analysis.detectedCategory}</span>
              )}
              {analysis.detectedColours.slice(0, 3).map(c => (
                <span key={c.name} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.8rem', fontWeight: 600 }}>🎨 {c.name}</span>
              ))}
              {analysis.detectedSize && (
                <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.8rem', fontWeight: 600 }}>📏 {analysis.detectedSize}</span>
              )}
              {analysis.labels.slice(0, 4).map(l => (
                <span key={l} style={{ background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.75rem' }}>{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Review form */}
        {showForm && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>✏️ Review &amp; Confirm</div>

            {/* Product */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem' }}>Product</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                {analysis.suggestedProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setForm(f => ({ ...f, productId: p.id, productName: p.name }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.55rem .75rem', borderRadius: '.65rem', cursor: 'pointer', border: form.productId === p.id ? '2px solid #9d174d' : '1.5px solid #e5e7eb', background: form.productId === p.id ? '#fdf2f8' : 'white', textAlign: 'left' }}>
                    {p.image && <img src={p.image} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0 }} />}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.875rem', color: form.productId === p.id ? '#9d174d' : '#111827' }}>{p.name}</div>
                      <div style={{ fontSize: '.75rem', color: '#9ca3af', textTransform: 'capitalize' }}>{p.category}</div>
                    </div>
                    {form.productId === p.id && <span style={{ marginLeft: 'auto', color: '#9d174d', fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Colour */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem' }}>Colour</label>
              {analysis.detectedColours.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.5rem' }}>
                  {analysis.detectedColours.map(c => (
                    <button key={c.name} onClick={() => setForm(f => ({ ...f, colour: c.name }))} style={pill(form.colour === c.name)}>{c.name}</button>
                  ))}
                </div>
              )}
              <input value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} placeholder="Type a colour…" style={inputStyle} />
            </div>

            {/* Size */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem' }}>Size</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.5rem' }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, size: s }))} style={pill(form.size === s)}>{s}</button>
                ))}
              </div>
              <input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="Or type a size…" style={inputStyle} />
            </div>

            {/* Stock qty */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.5rem' }}>Stock qty</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setForm(f => ({ ...f, stockCount: Math.max(0, f.stockCount - 1) }))} style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, minWidth: '2.5rem', textAlign: 'center' }}>{form.stockCount}</span>
                <button onClick={() => setForm(f => ({ ...f, stockCount: f.stockCount + 1 }))} style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving || saved} style={{ ...btnPrimary, opacity: saving || saved ? .7 : 1 }}>
              {saving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save to Inventory'}
            </button>
          </div>
        )}

        {!preview && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.85rem', marginTop: '1.5rem', lineHeight: 1.7 }}>
            Point your camera at a garment.<br/>
            AI will detect <strong>colour</strong>, <strong>type</strong> and <strong>size label</strong> automatically.
          </div>
        )}
      </div>
    </div>
  );
}
