'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  productId: string;
}

export function LikeButton({ productId }: Props) {
  const { session } = useAuth();
  const [liked,   setLiked]   = useState(false);
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const token = session?.access_token;

  function authHeaders(): HeadersInit {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    fetch(`/api/likes?product_id=${productId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setLiked(d.liked); setCount(d.count ?? 0); })
      .catch(() => {})
      .finally(() => setFetched(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, token]);

  async function toggle() {
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    if (loading) return;
    // Optimistic
    setLiked(prev => !prev);
    setCount(prev => liked ? prev - 1 : prev + 1);
    setLoading(true);
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ product_id: productId }),
      });
      const d = await res.json();
      if (res.ok) { setLiked(d.liked); setCount(d.count); }
      else        { setLiked(prev => !prev); setCount(prev => liked ? prev + 1 : prev - 1); }
    } catch {
      setLiked(prev => !prev);
      setCount(prev => liked ? prev + 1 : prev - 1);
    } finally {
      setLoading(false);
    }
  }

  if (!fetched) return null;

  return (
    <button
      onClick={toggle}
      aria-label={liked ? 'Unlike product' : 'Like product'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '.4rem',
        background: liked ? '#fff1f2' : 'var(--color-surface)',
        border: liked ? '1.5px solid #fca5a5' : '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-full)',
        padding: '.45rem 1rem',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        color: liked ? '#e11d48' : 'var(--color-text-muted)',
        transition: 'all .18s',
        userSelect: 'none',
        opacity: loading ? 0.7 : 1,
      }}
    >
      <span style={{
        fontSize: '1.1rem',
        transform: liked ? 'scale(1.2)' : 'scale(1)',
        transition: 'transform .2s cubic-bezier(.34,1.56,.64,1)',
        display: 'inline-block',
      }}>
        {liked ? '♥️' : '🤍'}
      </span>
      <span>{count > 0 ? count : ''} {liked ? 'Liked' : 'Like'}</span>
    </button>
  );
}
