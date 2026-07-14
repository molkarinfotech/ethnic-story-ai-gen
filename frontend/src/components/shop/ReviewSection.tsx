'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Review {
  id: string;
  rating: number;
  body?: string;
  created_at: string;
  profiles?: { display_name?: string; avatar_url?: string } | null;
}

interface Props {
  productId: string;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '.15rem', cursor: 'pointer' }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{
            fontSize: '1.5rem',
            color: n <= (hover || value) ? '#f59e0b' : '#d1d5db',
            transition: 'color .12s',
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function ReviewSection({ productId }: Props) {
  const { session } = useAuth();
  const token = session?.access_token;

  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [rating,    setRating]    = useState(0);
  const [body,      setBody]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState<{ ok: boolean; text: string } | null>(null);

  function authHeaders(): HeadersInit {
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  const loadReviews = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/reviews?product_id=${productId}&page=${p}&limit=5`)
      .then(r => r.json())
      .then(d => {
        setReviews(d.reviews ?? []);
        setTotal(d.total ?? 0);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { loadReviews(1); }, [loadReviews]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { window.location.href = '/auth/login'; return; }
    if (rating === 0) { setSubmitMsg({ ok: false, text: 'Please select a star rating.' }); return; }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ product_id: productId, rating, body: body.trim() || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        setSubmitMsg({ ok: true, text: 'Review submitted! +25 pts earned 🎉' });
        setRating(0);
        setBody('');
        loadReviews(1);
      } else {
        setSubmitMsg({ ok: false, text: d.error ?? 'Failed to submit review.' });
      }
    } catch (err: any) {
      setSubmitMsg({ ok: false, text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const totalPages = Math.ceil(total / 5);

  return (
    <section style={{
      borderTop: '1.5px solid var(--color-divider)',
      marginTop: 'var(--space-10)',
      paddingTop: 'var(--space-8)',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)',
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
            Reviews
            {total > 0 && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '.5rem' }}>({total})</span>}
          </h2>
          {avgRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.25rem' }}>
              <span style={{ color: '#f59e0b', fontSize: '1rem' }}>★</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{avgRating}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>out of 5</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            padding: '.4rem 1rem',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--color-text)',
          }}
        >
          {expanded ? '✕ Close' : '✍️ Write a Review'}
        </button>
      </div>

      {/* Review form */}
      {expanded && (
        <form onSubmit={submitReview} style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5) var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Your Rating *</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Your Review (optional)</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Share your thoughts about this product..."
              rows={3}
              style={{
                width: '100%',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: 'var(--text-sm)',
                resize: 'vertical',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          {submitMsg && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
              background: submitMsg.ok ? '#ecfdf5' : '#fef2f2',
              color:      submitMsg.ok ? '#065f46' : '#dc2626',
              border:     `1.5px solid ${submitMsg.ok ? '#6ee7b7' : '#fca5a5'}`,
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
            }}>
              {submitMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '.6rem 1.5rem',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
          {!token && (
            <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              <a href="/auth/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</a> to leave a review and earn +25 pts.
            </p>
          )}
        </form>
      )}

      {/* Review list */}
      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-4) 0' }}>Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>⭐</div>
          <div style={{ fontWeight: 600 }}>No reviews yet</div>
          <div style={{ fontSize: 'var(--text-xs)', marginTop: '.25rem' }}>Be the first to review this product and earn 25 pts!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {reviews.map(r => (
            <div key={r.id} style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4) var(--space-5)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                    {r.profiles?.display_name ?? 'Anonymous'}
                  </div>
                  <div style={{ color: '#f59e0b', fontSize: '.95rem', marginTop: '.1rem' }}>
                    {'\u2605'.repeat(r.rating)}{'\u2606'.repeat(5 - r.rating)}
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              {r.body && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.65, margin: 0 }}>{r.body}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
          <button
            onClick={() => loadReviews(page - 1)}
            disabled={page <= 1}
            style={paginationBtn(page > 1)}
          >← Prev</button>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => loadReviews(page + 1)}
            disabled={page >= totalPages}
            style={paginationBtn(page < totalPages)}
          >Next →</button>
        </div>
      )}
    </section>
  );
}

function paginationBtn(active: boolean): React.CSSProperties {
  return {
    background: active ? 'var(--color-primary)' : 'var(--color-surface)',
    color: active ? '#fff' : 'var(--color-text-muted)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    padding: '.35rem .85rem',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.4,
  };
}
