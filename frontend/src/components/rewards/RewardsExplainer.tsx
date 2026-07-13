'use client';

export default function RewardsExplainer() {
  const tiers = [
    { action: '🎉', label: 'Create an account', pts: 50 },
    { action: '❤️', label: 'Like a product',    pts: 10 },
    { action: '💬', label: 'Share feedback',    pts: 20 },
    { action: '⭐', label: 'Review a purchase', pts: 25 },
    { action: '🛍️', label: 'Every $1 spent',   pts: 1  },
  ];

  return (
    <section style={{
      background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)',
      border: '1.5px solid #e9d5ff', borderRadius: '16px',
      padding: '24px', maxWidth: '480px',
    }}>
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '2px' }}>✦ Culture Points</h3>
        <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>Earn points for every interaction. 100 pts = $1 off your next order.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tiers.map(t => (
          <div key={t.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'white', borderRadius: '10px', padding: '10px 14px',
            border: '1px solid #f3f4f6',
          }}>
            <span style={{ fontSize: '0.85rem', color: '#374151' }}>
              {t.action} {t.label}
            </span>
            <span style={{
              fontWeight: 700, fontSize: '0.85rem', color: '#7c3aed',
              background: '#f5f3ff', borderRadius: '9999px', padding: '2px 10px',
            }}>+{t.pts} pts</span>
          </div>
        ))}
      </div>
    </section>
  );
}
