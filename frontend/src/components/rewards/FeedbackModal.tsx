'use client';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'general', label: '💬 General' },
  { value: 'product',  label: '👗 Products' },
  { value: 'website',  label: '🖥️ Website' },
  { value: 'shipping', label: '📦 Shipping' },
  { value: 'other',    label: '✏️ Other' },
];

export default function FeedbackModal({ open, onClose }: Props) {
  const [category, setCategory] = useState('general');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ pts: number } | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rewards/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, body, rating: rating || null, email: email || null }),
      });
      const d = await res.json();
      if (res.ok) setDone({ pts: d.points_earned });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '28px',
        width: '100%', maxWidth: '460px', position: 'relative',
      }}>
        <button
          onClick={onClose} aria-label="Close"
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.25rem', color: '#9ca3af',
          }}
        >✕</button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🙏</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Thank you for your feedback!</h3>
            {done.pts > 0 && (
              <p style={{ color: '#7c3aed', fontWeight: 600 }}>You earned +{done.pts} Culture Points ✦</p>
            )}
            <button
              onClick={onClose}
              style={{
                marginTop: '16px', background: '#7c3aed', color: 'white',
                border: 'none', borderRadius: '9999px', padding: '8px 24px',
                cursor: 'pointer', fontWeight: 700,
              }}
            >Close</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '2px' }}>Share your feedback</h3>
              <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>Earn 20 Culture Points ✦ for sharing your thoughts</p>
            </div>

            {/* Category chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value} type="button"
                  onClick={() => setCategory(c.value)}
                  style={{
                    padding: '5px 12px', borderRadius: '9999px', fontSize: '0.75rem',
                    border: `1.5px solid ${category === c.value ? '#7c3aed' : '#e5e7eb'}`,
                    background: category === c.value ? '#f5f3ff' : 'white',
                    color: category === c.value ? '#7c3aed' : '#6b7280',
                    cursor: 'pointer', fontWeight: category === c.value ? 700 : 400,
                  }}
                >{c.label}</button>
              ))}
            </div>

            {/* Stars */}
            <div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '4px' }}>Overall rating (optional)</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n} type="button" onClick={() => setRating(r => r === n ? 0 : n)}
                    aria-label={`${n} star${n>1?'s':''}`}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '1.4rem', color: n <= rating ? '#f59e0b' : '#d1d5db',
                    }}
                  >★</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Message *</label>
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="What could we improve? What do you love?"
                rows={4} required minLength={10}
                style={{
                  width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db',
                  borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email (optional)</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="So we can follow up"
                style={{
                  width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db',
                  borderRadius: '8px', fontSize: '0.875rem',
                }}
              />
            </div>

            <button
              type="submit" disabled={loading || body.trim().length < 10}
              style={{
                background: '#7c3aed', color: 'white', border: 'none', borderRadius: '9999px',
                padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                opacity: loading || body.trim().length < 10 ? 0.6 : 1,
              }}
            >{loading ? 'Sending…' : 'Submit Feedback · Earn 20 pts ✦'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
