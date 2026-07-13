'use client';
import { useEffect, useState } from 'react';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at?: string;
  productName?: string;
  userName?: string;
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '1rem', letterSpacing: '.05em' }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null);

  async function loadReviews() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews');
      const data = await res.json();
      setReviews(data.reviews ?? []);
    } catch {
      setMsg({ ok: false, text: 'Failed to load reviews.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReviews(); }, []);

  async function deleteReview(id: string) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== id));
        setMsg({ ok: true, text: 'Review deleted.' });
      } else {
        const d = await res.json();
        setMsg({ ok: false, text: d.error ?? 'Delete failed.' });
      }
    } catch {
      setMsg({ ok: false, text: 'Network error.' });
    } finally {
      setDeleting(null);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  const filtered = reviews.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.body ?? '').toLowerCase().includes(q) ||
      (r.productName ?? '').toLowerCase().includes(q) ||
      (r.userName ?? '').toLowerCase().includes(q);
    const matchRating = ratingFilter === null || r.rating === ratingFilter;
    return matchSearch && matchRating;
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '900px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0 }}>⭐ Reviews</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          Manage all customer product reviews
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', minWidth: '120px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Total Reviews</div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>{reviews.length}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', minWidth: '120px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Avg Rating</div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span style={{ color: '#f59e0b' }}>★</span> {avgRating}
          </div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 'var(--space-2)' }}>Rating Breakdown</div>
          {ratingDist.map(({ n, count }) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '.2rem' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: '#f59e0b', width: '3rem' }}>{'★'.repeat(n)}</span>
              <div style={{ flex: 1, height: '6px', background: 'var(--color-surface-offset)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%', background: '#f59e0b', borderRadius: '99px', transition: 'width .4s' }} />
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', width: '1.5rem', textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <input
          type="text"
          placeholder="Search reviews, products, users…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: 'var(--space-2) var(--space-4)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {[null, 5, 4, 3, 2, 1].map(n => (
            <button
              key={String(n)}
              onClick={() => setRatingFilter(n)}
              style={{
                padding: '.35rem .75rem', fontSize: 'var(--text-xs)', fontWeight: 600, borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${ratingFilter === n ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: ratingFilter === n ? 'var(--color-primary)' : 'var(--color-surface)',
                color: ratingFilter === n ? '#fff' : 'var(--color-text)', cursor: 'pointer',
              }}
            >
              {n === null ? 'All' : `${'★'.repeat(n)}`}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
          background: msg.ok ? '#ecfdf5' : '#fef2f2', color: msg.ok ? '#065f46' : '#dc2626',
          border: `1.5px solid ${msg.ok ? '#6ee7b7' : '#fca5a5'}`, fontSize: 'var(--text-sm)', fontWeight: 600,
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Loading reviews…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>⭐</div>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>No reviews found</div>
          <div style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>Try adjusting your filters</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(r => (
            <div
              key={r.id}
              style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)',
                display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                  <Stars n={r.rating} />
                  {r.productName && (
                    <a
                      href={`/products/${r.product_id}`}
                      style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      {r.productName}
                    </a>
                  )}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    by {r.userName ?? 'Anonymous'}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginLeft: 'auto' }}>
                    {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {r.body ? (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.65, margin: 0 }}>{r.body}</p>
                ) : (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', margin: 0, fontStyle: 'italic' }}>No written review</p>
                )}
              </div>
              <button
                onClick={() => deleteReview(r.id)}
                disabled={deleting === r.id}
                aria-label="Delete review"
                style={{
                  background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5',
                  borderRadius: 'var(--radius-md)', padding: '.4rem .8rem', fontSize: 'var(--text-xs)',
                  fontWeight: 700, cursor: deleting === r.id ? 'wait' : 'pointer',
                  opacity: deleting === r.id ? 0.6 : 1, flexShrink: 0,
                }}
              >
                {deleting === r.id ? '…' : '🗑 Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
