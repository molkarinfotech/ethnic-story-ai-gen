'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SourcingRequest = {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  description: string;
  image_url: string | null;
  status: 'pending' | 'reviewed' | 'fulfilled' | 'declined';
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#fef3c7', color: '#92400e' },
  reviewed:  { bg: '#dbeafe', color: '#1e40af' },
  fulfilled: { bg: '#d1fae5', color: '#065f46' },
  declined:  { bg: '#fee2e2', color: '#991b1b' },
};

export default function AdminSourcingPage() {
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await sb
      .from('sourcing_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setRequests((data as SourcingRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    const { error: err } = await sb
      .from('sourcing_requests')
      .update({ status })
      .eq('id', id);
    if (!err) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as SourcingRequest['status'] } : r));
    }
    setUpdating(null);
  }

  async function deleteRequest(id: string) {
    if (!confirm('Delete this sourcing request?')) return;
    setUpdating(id);
    await sb.from('sourcing_requests').delete().eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
    setUpdating(null);
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .src-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.75rem; margin-bottom:1.5rem; }
        .src-title  { font-size:1.35rem; font-weight:700; color:#111827; margin:0; }
        .src-reload { background:#9d174d; color:#fff; border:none; border-radius:.5rem; padding:.4rem .9rem; font-size:.82rem; font-weight:600; cursor:pointer; }
        .src-reload:hover { background:#831843; }
        .src-stats  { display:flex; gap:.6rem; flex-wrap:wrap; margin-bottom:1.25rem; }
        .src-stat   { padding:.35rem .85rem; border-radius:2rem; font-size:.75rem; font-weight:700; cursor:pointer; border:2px solid transparent; transition:all .15s; }
        .src-stat.active { border-color:#9d174d; }
        .src-empty  { text-align:center; padding:3rem 1rem; color:#9ca3af; font-size:.9rem; }
        .src-card   { background:#fff; border:1.5px solid #fce7f3; border-radius:.75rem; margin-bottom:.9rem; overflow:hidden; transition:box-shadow .15s; }
        .src-card:hover { box-shadow:0 2px 12px rgba(157,23,77,.1); }
        .src-card-header { display:flex; align-items:flex-start; gap:.75rem; padding:.9rem 1rem; cursor:pointer; }
        .src-avatar { width:2.4rem; height:2.4rem; border-radius:50%; background:#fdf2f8; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; color:#9d174d; flex-shrink:0; }
        .src-meta   { flex:1; min-width:0; }
        .src-name   { font-weight:600; font-size:.9rem; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .src-email  { font-size:.78rem; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .src-date   { font-size:.72rem; color:#9ca3af; margin-top:.15rem; }
        .src-badge  { padding:.22rem .7rem; border-radius:2rem; font-size:.7rem; font-weight:700; flex-shrink:0; }
        .src-chevron { color:#9ca3af; flex-shrink:0; transition:transform .2s; }
        .src-chevron.open { transform:rotate(180deg); }
        .src-body   { padding:0 1rem 1rem; border-top:1px solid #fce7f3; }
        .src-desc   { font-size:.88rem; color:#374151; line-height:1.6; margin:.75rem 0; white-space:pre-wrap; word-break:break-word; }
        .src-image  { max-width:100%; max-height:260px; border-radius:.5rem; object-fit:cover; margin-bottom:.75rem; }
        .src-actions { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; }
        .src-select { border:1.5px solid #fce7f3; border-radius:.45rem; padding:.32rem .6rem; font-size:.8rem; font-weight:500; background:#fdf2f8; color:#9d174d; cursor:pointer; }
        .src-select:disabled { opacity:.5; cursor:not-allowed; }
        .src-del    { margin-left:auto; background:none; border:1.5px solid #fecaca; color:#dc2626; border-radius:.45rem; padding:.32rem .7rem; font-size:.78rem; font-weight:600; cursor:pointer; }
        .src-del:hover { background:#fee2e2; }
        .src-del:disabled { opacity:.5; cursor:not-allowed; }
        @media(max-width:520px) {
          .src-card-header { gap:.5rem; padding:.75rem .75rem; }
          .src-body { padding:0 .75rem .75rem; }
          .src-del { margin-left:0; }
        }
      `}</style>

      <div className="src-header">
        <h1 className="src-title">Sourcing Requests</h1>
        <button className="src-reload" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Status filter pills */}
      <div className="src-stats">
        {(['all', 'pending', 'reviewed', 'fulfilled', 'declined'] as const).map(s => {
          const count = s === 'all' ? requests.length : (counts[s] ?? 0);
          const col = s === 'all' ? { bg: '#f3f4f6', color: '#374151' } : STATUS_COLORS[s];
          return (
            <button
              key={s}
              className={`src-stat${filter === s ? ' active' : ''}`}
              style={{ background: col.bg, color: col.color }}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {error && <p style={{ color:'#dc2626', fontSize:'.85rem', marginBottom:'1rem' }}>Error: {error}</p>}

      {!loading && filtered.length === 0 && (
        <div className="src-empty">
          <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>📭</div>
          <div>No sourcing requests{filter !== 'all' ? ` with status "${filter}"` : ''} yet.</div>
        </div>
      )}

      {filtered.map(req => {
        const isOpen = expanded === req.id;
        const sc = STATUS_COLORS[req.status] ?? STATUS_COLORS.pending;
        const initial = (req.name || req.email).charAt(0).toUpperCase();
        const date = new Date(req.created_at).toLocaleDateString('en-AU', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        return (
          <div key={req.id} className="src-card">
            <div className="src-card-header" onClick={() => setExpanded(isOpen ? null : req.id)}>
              <div className="src-avatar">{initial}</div>
              <div className="src-meta">
                <div className="src-name">{req.name || 'Anonymous'}</div>
                <div className="src-email">{req.email}</div>
                <div className="src-date">{date}</div>
              </div>
              <span className="src-badge" style={{ background: sc.bg, color: sc.color }}>
                {req.status}
              </span>
              <svg className={`src-chevron${isOpen ? ' open' : ''}`} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            {isOpen && (
              <div className="src-body">
                <p className="src-desc">{req.description}</p>
                {req.image_url && (
                  <a href={req.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={req.image_url} alt="Sourcing reference" className="src-image" />
                  </a>
                )}
                <div className="src-actions">
                  <select
                    className="src-select"
                    value={req.status}
                    disabled={updating === req.id}
                    onChange={e => updateStatus(req.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="declined">Declined</option>
                  </select>
                  {updating === req.id && <span style={{ fontSize:'.78rem', color:'#9ca3af' }}>Saving…</span>}
                  <button
                    className="src-del"
                    disabled={updating === req.id}
                    onClick={() => deleteRequest(req.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
