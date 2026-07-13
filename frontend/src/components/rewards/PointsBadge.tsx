'use client';
import { useEffect, useState } from 'react';

interface PointsData {
  total: number;
  history: { action: string; points: number; created_at: string }[];
}

export default function PointsBadge() {
  const [data, setData] = useState<PointsData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/rewards/points')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const ACTION_LABELS: Record<string, string> = {
    signup: '🎉 Welcome bonus',
    like: '❤️ Liked a product',
    review: '⭐ Purchase review',
    feedback: '💬 Site feedback',
    purchase: '🛍️ Purchase reward',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: 'white', border: 'none', borderRadius: '9999px',
          padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem',
          fontWeight: 700, boxShadow: '0 2px 8px rgba(124,58,237,.35)',
        }}
        aria-label={`You have ${data.total} reward points`}
      >
        <span>✦</span>
        <span>{data.total.toLocaleString()} pts</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: '12px', padding: '16px', minWidth: '260px',
          boxShadow: '0 8px 30px rgba(0,0,0,.12)', zIndex: 999,
        }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px', color: '#111' }}>
            ✦ {data.total.toLocaleString()} Culture Points
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '12px' }}>
            {Math.floor(data.total / 100)} × $1 discount available
          </div>
          <hr style={{ borderColor: '#f3f4f6', marginBottom: '12px' }} />
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {data.history.slice(0, 8).map((h, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '5px 0',
                borderBottom: i < Math.min(data.history.length, 8) - 1 ? '1px solid #f9fafb' : 'none',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#374151' }}>
                  {ACTION_LABELS[h.action] ?? h.action}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed' }}>
                  +{h.points}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px' }}>
            <a href="/account#rewards" style={{
              fontSize: '0.75rem', color: '#7c3aed', textDecoration: 'none', fontWeight: 600,
            }}>View full history →</a>
          </div>
        </div>
      )}
    </div>
  );
}
