'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase as sb } from '../../lib/supabase'; // ← singleton fixes GoTrueClient warning

const BUCKET = 'product-images';
const POLL_INTERVAL = 4000;
const MAX_POLLS = 20;

type Props = {
  value: string;
  onChange: (url: string) => void;
  productId?: string;
};

type EnhanceStatus = 'idle' | 'loading' | 'done' | 'error';

export function ProductImageUploader({ value, onChange, productId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [enhanceStatus, setEnhanceStatus] = useState<EnhanceStatus>('idle');
  const [enhanceError, setEnhanceError]   = useState('');
  const [elapsed, setElapsed]         = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (elapsedRef.current) clearInterval(elapsedRef.current); }, []);

  const uploadFile = useCallback(async (file: File) => {
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
  }, [productId, onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  async function handleEnhance() {
    if (!value) return;
    setEnhanceStatus('loading');
    setEnhanceError('');
    setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    try {
      const submitRes = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: value, productId: productId ?? 'new' }),
      });
      const submitJson = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitJson.error ?? 'Failed to submit enhancement');

      const { predictionId } = submitJson;
      let polls = 0;
      while (polls < MAX_POLLS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        polls++;
        const pollRes = await fetch(
          `/api/enhance-image/poll?id=${predictionId}&productId=${encodeURIComponent(productId ?? 'new')}`
        );
        const pollJson = await pollRes.json();
        if (!pollRes.ok) throw new Error(pollJson.error ?? 'Polling failed');
        if (pollJson.status === 'succeeded') {
          onChange(pollJson.url);
          setEnhanceStatus('done');
          setTimeout(() => setEnhanceStatus('idle'), 3000);
          return;
        }
        if (pollJson.status === 'failed' || pollJson.status === 'canceled') {
          throw new Error(pollJson.error ?? `Replicate ${pollJson.status}`);
        }
      }
      throw new Error('Timed out waiting for enhancement. Please try again.');
    } catch (e: any) {
      setEnhanceError(e.message);
      setEnhanceStatus('error');
    } finally {
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: '12px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
          transition: 'all .2s ease', position: 'relative',
          minHeight: value ? '0' : '120px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
        }}
      >
        {uploading ? (
          <><div style={{ fontSize: '1.5rem' }}>⏳</div><p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)' }}>Uploading…</p></>
        ) : (
          <>
            <div style={{ fontSize: '1.5rem' }}>📁</div>
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
              <strong style={{ color: 'var(--color-primary)' }}>Click to upload</strong> or drag & drop
            </p>
            <p style={{ fontSize: '.75rem', color: 'var(--color-text-faint)', margin: 0 }}>JPEG, PNG, WebP — max 10 MB</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
      </div>

      {uploadError && <p style={{ color: '#dc2626', fontSize: '.8rem', margin: 0 }}>⚠ {uploadError}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        <span style={{ fontSize: '.75rem', color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>or paste URL</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
      </div>
      <input type="url" className="checkout-input" placeholder="https://example.com/image.jpg"
        value={value} onChange={e => onChange(e.target.value)} />

      {value && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Product preview"
            style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
            padding: '.75rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem',
          }}>
            <button
              type="button"
              onClick={handleEnhance}
              disabled={enhanceStatus === 'loading'}
              style={{
                background: enhanceStatus === 'loading' ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.9)',
                color: enhanceStatus === 'loading' ? '#fff' : '#111',
                border: 'none',
                borderRadius: '8px',
                padding: '.45rem .9rem',
                fontSize: '.78rem',
                fontWeight: 700,
                cursor: enhanceStatus === 'loading' ? 'wait' : 'pointer',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', gap: '.35rem',
              }}
            >
              {enhanceStatus === 'loading'
                ? `✨ Enhancing… ${elapsed}s`
                : enhanceStatus === 'done'
                  ? '✅ Enhanced!'
                  : '✨ AI Enhance'}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              style={{
                background: 'rgba(220,38,38,.85)',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '.45rem .9rem', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
          {enhanceError && (
            <p style={{ color: '#dc2626', fontSize: '.75rem', margin: '.5rem 0 0', padding: '0 .5rem' }}>⚠ {enhanceError}</p>
          )}
        </div>
      )}
    </div>
  );
}
