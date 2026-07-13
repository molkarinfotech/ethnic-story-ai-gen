'use client';
import { useState } from 'react';

interface Props {
  productId: string;
  orderId?: string;
  onSuccess?: (review: any) => void;
}

export default function ReviewForm({ productId, orderId, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; pts?: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || !body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rewards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, order_id: orderId, rating, title, body }),
      });
      const d = await res.json();
      if (!res.ok) { setResult({ ok: false, msg: d.error }); return; }
      setResult({
        ok: true,
        msg: d.verified_purchase
          ? `Review submitted! You earned +${d.points_earned} Culture Points ✦`
          : 'Review submitted! (Points awarded for verified purchases)',
        pts: d.points_earned,
      });
      onSuccess?.(d.review);
    } catch {
      setResult({ ok: false, msg: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok) return (
    <div style={{
      background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px',
      padding: '16px', textAlign: 'center', color: '#15803d', fontWeight: 600,
    }}>
      ✅ {result.msg}
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Star rating */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>Your rating *</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n} type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.6rem', lineHeight: 1,
                color: n <= (hoverRating || rating) ? '#f59e0b' : '#d1d5db',
                transition: 'color 120ms',
              }}
            >★</button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
          Title (optional)
        </label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Summarise your experience"
          style={{
            width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db',
            borderRadius: '8px', fontSize: '0.875rem', outline: 'none',
          }}
        />
      </div>

      {/* Body */}
      <div>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
          Review *
        </label>
        <textarea
          value={body} onChange={e => setBody(e.target.value)}
          placeholder="Tell us about the quality, fit, and delivery…"
          rows={4} required
          style={{
            width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db',
            borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical', outline: 'none',
          }}
        />
      </div>

      {result && !result.ok && (
        <div style={{ color: '#dc2626', fontSize: '0.82rem' }}>⚠️ {result.msg}</div>
      )}

      <button
        type="submit" disabled={loading || !rating || !body.trim()}
        style={{
          background: '#7c3aed', color: 'white', border: 'none', borderRadius: '9999px',
          padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
          opacity: loading || !rating || !body.trim() ? 0.6 : 1,
          transition: 'opacity 150ms',
        }}
      >
        {loading ? 'Submitting…' : 'Submit Review · Earn 25 pts ✦'}
      </button>
    </form>
  );
}
