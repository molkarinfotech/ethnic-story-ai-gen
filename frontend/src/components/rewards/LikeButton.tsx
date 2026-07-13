'use client';
import { useState, useEffect } from 'react';

interface Props {
  productId: string;
  initialLiked?: boolean;
  initialCount?: number;
  onAuthRequired?: () => void;
}

export default function LikeButton({ productId, initialLiked = false, initialCount = 0, onAuthRequired }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const method = liked ? 'DELETE' : 'POST';
      const res = await fetch('/api/rewards/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      });
      if (res.status === 401) {
        onAuthRequired?.();
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setLiked(d.liked);
        setCount(c => d.liked ? c + 1 : Math.max(0, c - 1));
        if (d.liked && d.points_earned) {
          setFlash(true);
          setTimeout(() => setFlash(false), 2000);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={liked ? 'Unlike product' : 'Like product'}
        aria-pressed={liked}
        style={{
          background: liked ? '#fef2f2' : 'transparent',
          border: `1.5px solid ${liked ? '#fca5a5' : '#d1d5db'}`,
          borderRadius: '9999px',
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: '0.85rem',
          color: liked ? '#dc2626' : '#6b7280',
          transition: 'all 160ms ease',
          transform: loading ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{liked ? '❤️' : '🤍'}</span>
        <span>{count > 0 ? count : ''}</span>
      </button>
      {flash && (
        <span style={{
          position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)',
          background: '#7c3aed', color: 'white', borderRadius: '9999px',
          padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
          animation: 'fadeInUp 0.3s ease',
        }}>+10 pts ✦</span>
      )}
    </div>
  );
}
