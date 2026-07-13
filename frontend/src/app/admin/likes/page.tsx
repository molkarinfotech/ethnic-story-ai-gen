'use client';
import { useEffect, useState } from 'react';

interface LikeRow {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
  productName?: string;
  userName?: string;
  productSlug?: string;
}

interface ProductLikeSummary {
  product_id: string;
  productName: string;
  productSlug: string;
  count: number;
  latestLike: string;
}

export default function AdminLikesPage() {
  const [likes, setLikes]             = useState<LikeRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [view, setView]               = useState<'by-product' | 'all'>('by-product');

  useEffect(() => {
    fetch('/api/admin/likes')
      .then(r => r.json())
      .then(d => setLikes(d.likes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = likes.filter(l => {
    const q = search.toLowerCase();
    return !q ||
      (l.productName ?? '').toLowerCase().includes(q) ||
      (l.userName ?? '').toLowerCase().includes(q);
  });

  // Group by product for summary view
  const byProduct: ProductLikeSummary[] = Object.values(
    filtered.reduce<Record<string, ProductLikeSummary>>((acc, l) => {
      const key = l.product_id;
      if (!acc[key]) {
        acc[key] = { product_id: key, productName: l.productName ?? 'Unknown', productSlug: l.productSlug ?? key, count: 0, latestLike: l.created_at };
      }
      acc[key].count++;
      if (l.created_at > acc[key].latestLike) acc[key].latestLike = l.created_at;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '900px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0 }}>♥ Likes</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          See which products customers are saving and liking
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', minWidth: '130px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Total Likes</div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginTop: 'var(--space-1)', color: '#e11d48' }}>♥ {likes.length}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', minWidth: '130px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Products Liked</div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>{byProduct.length}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', minWidth: '130px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Most Liked</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginTop: 'var(--space-1)', color: 'var(--color-primary)' }}>
            {byProduct[0]?.productName ?? '—'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <input
          type="text"
          placeholder="Search by product or user…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: 'var(--space-2) var(--space-4)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {(['by-product', 'all'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '.35rem .9rem', fontSize: 'var(--text-xs)', fontWeight: 600, borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${view === v ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: view === v ? 'var(--color-primary)' : 'var(--color-surface)',
                color: view === v ? '#fff' : 'var(--color-text)', cursor: 'pointer',
              }}
            >
              {v === 'by-product' ? 'By Product' : 'All Likes'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Loading likes…</div>
      ) : view === 'by-product' ? (
        byProduct.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>♡</div>
            <div style={{ fontWeight: 600 }}>No likes yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {byProduct.map((p, i) => (
              <div
                key={p.product_id}
                style={{
                  background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--color-text-faint)', minWidth: '1.5rem', textAlign: 'right' }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.productName}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '.15rem' }}>
                    Last liked {new Date(p.latestLike).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-full)', padding: '.3rem .9rem' }}>
                  <span style={{ color: '#e11d48', fontSize: '1rem' }}>♥</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#e11d48' }}>{p.count}</span>
                </div>
                <a
                  href={`/products/${p.productSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', flexShrink: 0 }}
                >
                  View →
                </a>
              </div>
            ))}
          </div>
        )
      ) : (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>♡</div>
            <div style={{ fontWeight: 600 }}>No likes found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {filtered.map(l => (
              <div
                key={l.id}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#e11d48', fontSize: '1.1rem' }}>♥</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{l.productName ?? l.product_id}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginLeft: '.5rem' }}>by {l.userName ?? 'User'}</span>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                  {new Date(l.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
