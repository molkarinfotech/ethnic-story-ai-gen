'use client';
import { useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET = 'product-images';

type Props = {
  value: string;
  onChange: (url: string) => void;
  productId?: string;
};

type EnhanceStatus = 'idle' | 'loading' | 'done' | 'error';

export function ProductImageUploader({ value, onChange, productId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [enhanceStatus, setEnhanceStatus] = useState<EnhanceStatus>('idle');
  const [enhanceError, setEnhanceError] = useState('');

  // ── Upload helper ──────────────────────────────────────────────
  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Max file size is 10 MB.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${productId ?? 'new'}-${Date.now()}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      setUploadError(e.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  // ── Drag & drop ────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [productId]);

  // ── AI enhance ────────────────────────────────────────────────
  async function handleEnhance() {
    if (!value) return;
    setEnhanceStatus('loading');
    setEnhanceError('');
    try {
      const res = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: value, productId: productId ?? 'new' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Enhancement failed');
      onChange(json.url);
      setEnhanceStatus('done');
      setTimeout(() => setEnhanceStatus('idle'), 3000);
    } catch (e: any) {
      setEnhanceError(e.message);
      setEnhanceStatus('error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
          transition: 'all .2s ease',
          position: 'relative',
          minHeight: value ? '0' : '120px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
        }}
      >
        {uploading ? (
          <>
            <div style={{ fontSize: '1.5rem' }}>⏳</div>
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)' }}>Uploading…</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '1.5rem' }}>📁</div>
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
              <strong style={{ color: 'var(--color-primary)' }}>Click to upload</strong> or drag & drop
            </p>
            <p style={{ fontSize: '.75rem', color: 'var(--color-text-faint)', margin: 0 }}>JPEG, PNG, WebP — max 10 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />
      </div>

      {uploadError && (
        <p style={{ color: '#dc2626', fontSize: '.8rem', margin: 0 }}>⚠ {uploadError}</p>
      )}

      {/* URL fallback */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        <span style={{ fontSize: '.75rem', color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>or paste URL</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
      </div>
      <input
        type="url"
        className="checkout-input"
        placeholder="https://example.com/image.jpg"
        value={value}
        onChange={e => onChange(e.target.value)}
      />

      {/* Preview + AI enhance */}
      {value && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Product preview"
            style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />

          {/* AI Enhance bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
            padding: '.75rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem',
          }}>
            <div style={{ color: '#fff', fontSize: '.78rem', lineHeight: 1.3 }}>
              <strong style={{ display: 'block', fontSize: '.82rem' }}>✨ AI Image Enhance</strong>
              Upscale & sharpen with AI
            </div>
            <button
              type="button"
              onClick={handleEnhance}
              disabled={enhanceStatus === 'loading'}
              style={{
                background: enhanceStatus === 'done' ? '#16a34a' : enhanceStatus === 'error' ? '#dc2626' : 'var(--color-primary)',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '.45rem 1rem', fontSize: '.8rem', fontWeight: 700,
                cursor: enhanceStatus === 'loading' ? 'wait' : 'pointer',
                whiteSpace: 'nowrap', transition: 'background .3s',
                display: 'flex', alignItems: 'center', gap: '.35rem',
                flexShrink: 0,
              }}
            >
              {enhanceStatus === 'loading' && <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>}
              {enhanceStatus === 'idle'    && '✨ Enhance'}
              {enhanceStatus === 'loading' && 'Enhancing…'}
              {enhanceStatus === 'done'    && '✅ Enhanced!'}
              {enhanceStatus === 'error'   && '✕ Failed'}
            </button>
          </div>

          {enhanceError && (
            <p style={{ color: '#dc2626', fontSize: '.75rem', padding: '.4rem .75rem', background: '#fef2f2', margin: 0 }}>
              {enhanceError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
