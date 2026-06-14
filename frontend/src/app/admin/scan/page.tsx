'use client';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
type DetectedColour = { name: string; score: number; pixelFraction: number };
type SuggestedProduct = { id: string; name: string; slug: string; category: string; image?: string };

type AnalysisResult = {
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

const CATEGORIES = ['sarees', 'lehengas', 'kurtas', 'kids'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

// Tailwind-free inline style helpers
const card: React.CSSProperties = {
  background: 'white', borderRadius: '1rem',
  boxShadow: '0 2px 12px rgba(0,0,0,.08)',
  padding: '1.25rem', marginBottom: '1rem',
};
const pill = (active: boolean, danger = false): React.CSSProperties => ({
  padding: '.35rem .9rem', borderRadius: '2rem', fontSize: '.8rem', fontWeight: 600,
  border: active ? '2px solid #9d174d' : '1.5px solid #e5e7eb',
  background: active ? '#fdf2f8' : danger ? '#fef2f2' : 'white',
  color:  active ? '#9d174d' : danger ? '#dc2626' : '#374151',
  cursor: 'pointer', transition: 'all .15s',
});
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '.65rem .85rem', border: '1.5px solid #e5e7eb',
  borderRadius: '.65rem', fontSize: '.95rem', boxSizing: 'border-box',
  appearance: 'none', background: 'white',
};
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '1rem', borderRadius: '.75rem', border: 'none',
  background: '#9d174d', color: 'white', fontSize: '1rem', fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
};

// ─── Component ────────────────────────────────────────────────────────────────
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
    productId:   '',
    productName: '',
    colour:      '',
    size:        '',
    stockCount:  1,
  });

  // ── Handle photo capture / file pick ──────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setAnalysis(null);
    setSaved(false);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));

    // Auto-analyse immediately
    setAnalysing(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetch('/api/admin/scan-analyse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');

      setAnalysis(data);
      // Pre-fill form from detections
      setForm(f => ({
        ...f,
        colour:    data.primaryColour ?? f.colour,
        size:      data.detectedSize  ?? f.size,
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

  // ── Save variant + upload image ───────────────────────────────────────────
  async function handleSave() {
    if (!form.productId) { setError('Please select a product'); return; }
    if (!form.size)      { setError('Please select a size');    return; }
    if (!imageFile)      { setError('No image to upload');      return; }
    setSaving(true); setError(null);

    try {
      // 1. Upload image + insert into product_images
      const fd = new FormData();
      fd.append('image',      imageFile);
      fd.append('product_id', form.productId);
      fd.append('colour',     form.colour);
      fd.append('sort_order', '0');
      const uploadRes = await fetch('/api/admin/scan-upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed');

      // 2. Upsert the size+colour variant stock
      const stockRes = await fetch('/api/admin/stock', {
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
      // Reset after 1.5s for next scan
      setTimeout(() => {
        setPreview(null); setImageFile(null); setAnalysis(null); setSaved(false);
        setForm({ productId: '', productName: '', colour: '', size: '', stockCount: 1 });
        fileRef.current && (fileRef.current.value = '');
      }, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#fdf2f8', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: '#9d174d', color: 'white', padding: '.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>📷 Inventory Scanner</span>
        </div>
        <span style={{ fontSize: '.75rem', opacity: .7 }}>Powered by Google Vision</span>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1rem' }}>

        {/* ── Camera / file picker ── */}
        {!preview && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ background: 'white', border: '2px dashed #e9a8c8', borderRadius: '1.25rem', padding: '3rem 1rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '.5rem' }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#9d174d' }}>Tap to photograph garment</div>
            <div style={{ color: '#9ca3af', fontSize: '.85rem', marginTop: '.3rem' }}>Camera or choose from library</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onInputChange}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* ── Preview + retake ── */}
        {preview && (
          <div style={{ ...card, padding: 0, overflow: 'hidden', position: 'relative' }}>
            <img src={preview} alt="Scanned garment" style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', display: 'block' }} />
            {analysing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '.75rem' }}>
                <div style={{ fontSize: '2rem' }}>🔍</div>
                <div style={{ fontWeight: 700 }}>Analysing…</div>
              </div>
            )}
            {saved && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '.5rem' }}>
                <div style={{ fontSize: '3rem' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Saved!</div>
              </div>
            )}
            <button
              onClick={() => { setPreview(null); setImageFile(null); setAnalysis(null); fileRef.current && (fileRef.current.value = ''); }}
              style={{ position: 'absolute', top: '.6rem', right: '.6rem', background: 'rgba(0,0,0,.5)', color: 'white', border: 'none', borderRadius: '2rem', padding: '.3rem .75rem', fontSize: '.8rem', cursor: 'pointer' }}>
              Retake
            </button>
          </div>
        )}

        {/* ── AI detections summary ── */}
        {analysis && !analysing && (
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

        {/* ── Error ── */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.75rem', padding: '.85rem 1rem', color: '#dc2626', fontSize: '.875rem', marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Review form ── */}
        {analysis && !analysing && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>✏️ Review &amp; Confirm</div>

            {/* Product selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem' }}>Product</label>
              {analysis.suggestedProducts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.5rem' }}>
                  {analysis.suggestedProducts.slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setForm(f => ({ ...f, productId: p.id, productName: p.name }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '.65rem',
                        padding: '.55rem .75rem', borderRadius: '.65rem', cursor: 'pointer',
                        border: form.productId === p.id ? '2px solid #9d174d' : '1.5px solid #e5e7eb',
                        background: form.productId === p.id ? '#fdf2f8' : 'white',
                        textAlign: 'left',
                      }}>
                      {p.image && <img src={p.image} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.875rem', color: form.productId === p.id ? '#9d174d' : '#111827' }}>{p.name}</div>
                        <div style={{ fontSize: '.75rem', color: '#9ca3af', textTransform: 'capitalize' }}>{p.category}</div>
                      </div>
                      {form.productId === p.id && <span style={{ marginLeft: 'auto', color: '#9d174d' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colour */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem' }}>Colour</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.4rem' }}>
                {analysis.detectedColours.map(c => (
                  <button key={c.name} onClick={() => setForm(f => ({ ...f, colour: c.name }))} style={pill(form.colour === c.name)}>{c.name}</button>
                ))}
              </div>
              <input
                value={form.colour}
                onChange={e => setForm(f => ({ ...f, colour: e.target.value }))}
                placeholder="Or type a colour…"
                style={inputStyle}
              />
            </div>

            {/* Size */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem' }}>Size</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.4rem' }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, size: s }))} style={pill(form.size === s)}>{s}</button>
                ))}
              </div>
              <input
                value={form.size}
                onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                placeholder="Or type a size…"
                style={inputStyle}
              />
            </div>

            {/* Stock count */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.4rem' }}>Stock qty</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setForm(f => ({ ...f, stockCount: Math.max(0, f.stockCount - 1) }))} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, minWidth: '2.5rem', textAlign: 'center' }}>{form.stockCount}</span>
                <button onClick={() => setForm(f => ({ ...f, stockCount: f.stockCount + 1 }))} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>

            {/* Save button */}
            <button onClick={handleSave} disabled={saving || saved} style={{ ...btnPrimary, opacity: saving || saved ? .7 : 1 }}>
              {saving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save to Inventory'}
            </button>
          </div>
        )}

        {/* Prompt to scan if no image yet */}
        {!preview && !analysis && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.85rem', marginTop: '1.5rem', lineHeight: 1.7 }}>
            Point your camera at a garment.<br/>
            AI will detect the <strong>colour</strong>, <strong>category</strong> and <strong>size label</strong> automatically.
          </div>
        )}

      </div>
    </div>
  );
}
