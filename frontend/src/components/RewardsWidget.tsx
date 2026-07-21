'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface PointsRow {
  action: string;
  points: number;
  ref_id: string;
  created_at: string;
}

interface RewardsData {
  total: number;
  history: PointsRow[];
}

interface Redemption {
  coupon_code: string;
  points_spent: number;
  discount_aud: number;
  redeemed_at: string;
  used_at: string | null;
  expires_at: string | null;
}

const TIER_CONFIG = [
  { name: 'Bronze', min: 0,    max: 399,      color: '#cd7f32', emoji: '\uD83E\uDD49' },
  { name: 'Silver', min: 400,  max: 999,      color: '#9b9b9b', emoji: '\uD83E\uDD48' },
  { name: 'Gold',   min: 1000, max: Infinity, color: '#d4af37', emoji: '\uD83E\uDD47' },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  signup:          { label: 'Welcome bonus',       color: '#7c3aed' },
  purchase:        { label: 'Purchase reward',      color: '#059669' },
  order:           { label: 'Purchase reward',      color: '#059669' },
  like:            { label: 'Liked a product',      color: '#db2777' },
  review:          { label: 'Product review',       color: '#2563eb' },
  redeem:          { label: 'Redeemed for coupon',  color: '#dc2626' },
  redeem_rollback: { label: 'Redemption refunded',  color: '#059669' },
};

const REDEEM_STEPS = [200, 400, 800, 1600];

export default function RewardsWidget() {
  const { session } = useAuth();
  const [data, setData]             = useState<RewardsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchErr, setFetchErr]     = useState<string | null>(null);
  const [tab, setTab]               = useState<'overview' | 'history' | 'redeem'>('overview');
  const [redeemPts, setRedeemPts]   = useState(REDEEM_STEPS[0]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redeemState, setRedeemState] = useState<{
    code?: string; discount?: number; expires?: string; error?: string; loading: boolean;
  }>({ loading: false });

  function authHeaders(): HeadersInit {
    const token = session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  function loadPoints() {
    setLoading(true);
    setFetchErr(null);
    fetch('/api/rewards/points', { headers: authHeaders() })
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        if (typeof json.total !== 'number') throw new Error('Unexpected response shape');
        return json as RewardsData;
      })
      .then(d => setData(d))
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false));
  }

  function loadRedemptions() {
    fetch('/api/rewards/redeem', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.redemptions)) setRedemptions(d.redemptions);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (session !== undefined) {
      loadPoints();
      loadRedemptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Also load redemptions when switching to the redeem tab
  useEffect(() => {
    if (tab === 'redeem' && session !== undefined) loadRedemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleRedeem() {
    setRedeemState({ loading: true });
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ points: redeemPts }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRedeemState({ loading: false, error: json.error });
      } else {
        setRedeemState({
          loading: false,
          code:    json.coupon_code,
          discount: json.discount_aud,
          expires: json.expires_at,
        });
        // Refresh balance and redemption list
        fetch('/api/rewards/points', { headers: authHeaders() })
          .then(r => r.json())
          .then(d => typeof d.total === 'number' && setData(d));
        loadRedemptions();
      }
    } catch (e: unknown) {
      setRedeemState({ loading: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  const tier     = TIER_CONFIG.find(t => (data?.total ?? 0) >= t.min && (data?.total ?? 0) <= t.max) ?? TIER_CONFIG[0];
  const nextTier = TIER_CONFIG[TIER_CONFIG.indexOf(tier) + 1];
  const progress = nextTier
    ? Math.min(100, (((data?.total ?? 0) - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  // Active coupons: not used and not expired
  const now = new Date();
  const activeCoupons = redemptions.filter(r =>
    !r.used_at &&
    (!r.expires_at || new Date(r.expires_at) > now)
  );

  if (loading) return (
    <div style={styles.card}>
      <div style={styles.skeleton} />
      <div style={{ ...styles.skeleton, width: '60%' }} />
    </div>
  );

  if (fetchErr) return (
    <div style={{ ...styles.card, textAlign: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>\u26A0\uFE0F</div>
      <div style={{ fontWeight: 700, color: '#111', marginBottom: '.25rem' }}>Couldn&apos;t load rewards</div>
      <div style={{ fontSize: '.82rem', color: '#6b7280', marginBottom: '1rem' }}>{fetchErr}</div>
      <button onClick={loadPoints} style={{ padding: '.45rem 1.25rem', background: '#111', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}>Retry</button>
    </div>
  );

  if (!data) return null;

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.tierBadge(tier.color)}>{tier.emoji} {tier.name} Member</div>
          <div style={styles.pts}>{data.total.toLocaleString()} pts</div>
          {nextTier && (
            <div style={styles.nextTierLabel}>
              {nextTier.min - data.total} pts to {nextTier.emoji} {nextTier.name}
            </div>
          )}
        </div>
        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={styles.progressFill(progress, tier.color)} />
          </div>
          <div style={styles.progressPct}>{Math.round(progress)}%</div>
        </div>
      </div>

      {/* Earn summary */}
      <div style={styles.earnGrid}>
        {[
          { action: 'signup',   pts: '+50',     label: 'Sign up' },
          { action: 'purchase', pts: '+1/AU$1', label: 'Every order' },
          { action: 'like',     pts: '+10',     label: 'Like product' },
          { action: 'review',   pts: '+25',     label: 'Verified review' },
        ].map(item => (
          <div key={item.action} style={styles.earnItem}>
            <span style={styles.earnPts(ACTION_LABELS[item.action]?.color ?? '#6b7280')}>{item.pts}</span>
            <span style={styles.earnLabel}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'history', 'redeem'] as const).map(t => (
          <button key={t} style={styles.tab(t === tab)} onClick={() => setTab(t)}>
            {t === 'redeem' && activeCoupons.length > 0
              ? `Redeem (${activeCoupons.length} active)`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ───────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ padding: '1rem 0 .25rem' }}>
          <div style={styles.row}><span style={styles.rowLabel}>Your balance</span><strong>{data.total} pts</strong></div>
          <div style={styles.row}><span style={styles.rowLabel}>Tier</span><strong style={{ color: tier.color }}>{tier.emoji} {tier.name}</strong></div>
          <div style={styles.row}><span style={styles.rowLabel}>Min. redeem</span><span>200 pts = $2.50 AU</span></div>
          <div style={styles.row}><span style={styles.rowLabel}>Rate</span><span>80 pts = $1.00 AU</span></div>
          <div style={styles.row}><span style={styles.rowLabel}>Coupon validity</span><span>30 days from redemption</span></div>
        </div>
      )}

      {/* ── History ────────────────────────────────────── */}
      {tab === 'history' && (
        <div style={{ maxHeight: 280, overflowY: 'auto', paddingTop: '0.5rem' }}>
          {data.history.length === 0 && (
            <div style={styles.empty}>No activity yet. Start earning! \uD83C\uDF89</div>
          )}
          {data.history.map((row, i) => {
            const cfg = ACTION_LABELS[row.action] ?? { label: row.action, color: '#6b7280' };
            return (
              <div key={i} style={styles.historyRow}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{cfg.label}</div>
                  <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>
                    {new Date(row.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={styles.ptsBadge(row.points > 0 ? '#059669' : '#dc2626')}>
                  {row.points > 0 ? '+' : ''}{row.points}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Redeem ─────────────────────────────────────── */}
      {tab === 'redeem' && (
        <div style={{ paddingTop: '0.75rem' }}>
          <label style={styles.label}>Select points to redeem</label>
          <div style={styles.redeemGrid}>
            {REDEEM_STEPS.map(step => (
              <button
                key={step}
                style={styles.redeemOption(redeemPts === step, (data?.total ?? 0) >= step)}
                onClick={() => setRedeemPts(step)}
                disabled={(data?.total ?? 0) < step}
              >
                <div style={{ fontWeight: 700 }}>{step} pts</div>
                <div style={{ fontSize: '.75rem', opacity: .8 }}>${(step / 80).toFixed(2)} AU</div>
              </button>
            ))}
          </div>

          {redeemState.code ? (
            <div style={styles.successBox}>
              <div style={{ fontWeight: 700, marginBottom: '.25rem' }}>\uD83C\uDF89 Coupon generated!</div>
              <div style={styles.couponCode}>{redeemState.code}</div>
              <div style={{ fontSize: '.8rem', marginTop: '.25rem', color: '#065f46', marginBottom: '.15rem' }}>
                <strong>${redeemState.discount?.toFixed(2)} AU</strong> discount — enter at checkout
              </div>
              {redeemState.expires && (
                <div style={{ fontSize: '.72rem', color: '#6b7280' }}>
                  Valid until {new Date(redeemState.expires).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              <button
                onClick={() => {
                  setRedeemState({ loading: false });
                }}
                style={{ marginTop: '.65rem', fontSize: '.78rem', fontWeight: 600, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Redeem more points
              </button>
            </div>
          ) : (
            <>
              {redeemState.error && <div style={styles.errorBox}>{redeemState.error}</div>}
              <button
                onClick={handleRedeem}
                disabled={redeemState.loading || (data?.total ?? 0) < redeemPts}
                style={styles.redeemBtn((data?.total ?? 0) >= redeemPts)}
              >
                {redeemState.loading ? 'Generating\u2026' : `Redeem ${redeemPts} pts for $${(redeemPts / 80).toFixed(2)} AU`}
              </button>
            </>
          )}

          {/* ── Active coupons panel ── */}
          {activeCoupons.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#374151', marginBottom: '.5rem' }}>
                \uD83C\uDFF7\uFE0F Your active reward coupons
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {activeCoupons.map((r, i) => (
                  <div key={i} style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '.65rem', padding: '.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '.1em', color: '#059669' }}>{r.coupon_code}</div>
                      <div style={{ fontSize: '.72rem', color: '#047857', marginTop: '.1rem' }}>
                        <strong>${r.discount_aud.toFixed(2)} AU</strong> off \u00B7 {r.points_spent} pts
                      </div>
                    </div>
                    <div style={{ fontSize: '.7rem', color: '#6b7280', textAlign: 'right' }}>
                      {r.expires_at ? (
                        <span>Expires {new Date(r.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      ) : 'No expiry'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All past redemptions */}
          {redemptions.filter(r => r.used_at || (r.expires_at && new Date(r.expires_at) <= now)).length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '.75rem', color: '#9ca3af', fontWeight: 600, marginBottom: '.35rem' }}>Past redemptions</div>
              {redemptions
                .filter(r => r.used_at || (r.expires_at && new Date(r.expires_at) <= now))
                .map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', padding: '.3rem 0', borderBottom: '1px solid #f3f4f6', color: '#9ca3af' }}>
                    <span style={{ fontFamily: 'monospace' }}>{r.coupon_code}</span>
                    <span>{r.used_at ? '\u2713 Used' : '\u23F3 Expired'} · ${r.discount_aud.toFixed(2)} AU</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = {
  card: { background: '#fff', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,.08)', maxWidth: 440, width: '100%', fontFamily: "'Satoshi', 'Inter', sans-serif" } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' } as React.CSSProperties,
  tierBadge: (color: string): React.CSSProperties => ({ display: 'inline-block', background: color + '18', color, border: `1.5px solid ${color}40`, borderRadius: '2rem', padding: '.2rem .7rem', fontSize: '.78rem', fontWeight: 700, letterSpacing: '.02em', marginBottom: '.35rem' }),
  pts: { fontSize: '2rem', fontWeight: 800, color: '#111', lineHeight: 1.1 } as React.CSSProperties,
  nextTierLabel: { fontSize: '.72rem', color: '#6b7280', marginTop: '.2rem' } as React.CSSProperties,
  progressWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.25rem', minWidth: 80 } as React.CSSProperties,
  progressTrack: { width: 80, height: 8, background: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' } as React.CSSProperties,
  progressFill: (pct: number, color: string): React.CSSProperties => ({ width: `${pct}%`, height: '100%', background: color, borderRadius: '9999px', transition: 'width .4s ease' }),
  progressPct: { fontSize: '.72rem', color: '#6b7280' } as React.CSSProperties,
  earnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', background: '#f9fafb', borderRadius: '.75rem', padding: '.75rem', marginBottom: '.75rem' } as React.CSSProperties,
  earnItem: { display: 'flex', flexDirection: 'column', gap: '.1rem' } as React.CSSProperties,
  earnPts: (color: string): React.CSSProperties => ({ fontWeight: 800, fontSize: '.9rem', color }),
  earnLabel: { fontSize: '.72rem', color: '#6b7280' } as React.CSSProperties,
  tabs: { display: 'flex', gap: '.25rem', borderBottom: '1.5px solid #f3f4f6', paddingBottom: '.5rem', marginBottom: '.25rem' } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ padding: '.3rem .85rem', borderRadius: '2rem', border: 'none', background: active ? '#111' : 'transparent', color: active ? '#fff' : '#6b7280', fontWeight: active ? 700 : 500, fontSize: '.82rem', cursor: 'pointer', transition: 'all .15s' }),
  row: { display: 'flex', justifyContent: 'space-between', padding: '.45rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '.875rem' } as React.CSSProperties,
  rowLabel: { color: '#6b7280' } as React.CSSProperties,
  empty: { textAlign: 'center' as const, padding: '2rem 0', color: '#9ca3af', fontSize: '.875rem' },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.55rem 0', borderBottom: '1px solid #f9fafb' } as React.CSSProperties,
  ptsBadge: (color: string): React.CSSProperties => ({ fontWeight: 800, color, fontSize: '.9rem', minWidth: 44, textAlign: 'right' }),
  label: { display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#374151', marginBottom: '.5rem' } as React.CSSProperties,
  redeemGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '.75rem' } as React.CSSProperties,
  redeemOption: (selected: boolean, affordable: boolean): React.CSSProperties => ({ padding: '.65rem', borderRadius: '.65rem', border: selected ? '2px solid #111' : '1.5px solid #e5e7eb', background: selected ? '#111' : affordable ? '#fff' : '#f9fafb', color: selected ? '#fff' : affordable ? '#111' : '#9ca3af', cursor: affordable ? 'pointer' : 'not-allowed', textAlign: 'center', transition: 'all .15s', opacity: affordable ? 1 : 0.5 }),
  redeemBtn: (canAfford: boolean): React.CSSProperties => ({ width: '100%', padding: '.75rem', background: canAfford ? '#111' : '#e5e7eb', color: canAfford ? '#fff' : '#9ca3af', border: 'none', borderRadius: '.65rem', fontWeight: 700, fontSize: '.875rem', cursor: canAfford ? 'pointer' : 'not-allowed', transition: 'background .15s' }),
  successBox: { background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: '.65rem', padding: '.85rem 1rem', textAlign: 'center' as const, color: '#065f46' } as React.CSSProperties,
  couponCode: { fontFamily: 'monospace', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '.15em', color: '#059669' } as React.CSSProperties,
  errorBox: { background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '.65rem', padding: '.65rem 1rem', color: '#dc2626', fontSize: '.82rem', marginBottom: '.5rem' } as React.CSSProperties,
  skeleton: { background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '.5rem', height: '1.25rem', marginBottom: '.5rem', width: '80%' } as React.CSSProperties,
};
