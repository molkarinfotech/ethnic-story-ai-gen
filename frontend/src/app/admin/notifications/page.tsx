'use client';
import { useState, useEffect, useCallback } from 'react';

interface NotificationEntry {
  id: string;
  email: string;
  product_id: string;
  product_name: string;
  product_slug?: string | null;
  variant_id?: string | null;
  size?: string | null;
  colour?: string | null;
  notified: boolean;
  notify_type?: string | null;   // 'restock' | 'coming_soon'
  created_at: string;
}

type FilterStatus = 'all' | 'pending' | 'notified';
type FilterType   = 'all' | 'restock' | 'coming_soon';

const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  restock:     { label: 'Restock',     bg: '#fce7f3', color: '#9d174d' },
  coming_soon: { label: 'Coming Soon', bg: '#dbeafe', color: '#1e40af' },
};

export default function AdminNotificationsPage() {
  const [entries, setEntries]           = useState<NotificationEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter,  setFilter]            = useState<FilterStatus>('pending');
  const [typeFilter, setTypeFilter]     = useState<FilterType>('all');
  const [search,  setSearch]            = useState('');
  const [sending, setSending]           = useState<string | null>(null);
  const [sendingAll, setSendingAll]     = useState(false);
  const [toast,   setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/notifications');
      const json = await res.json();
      setEntries(json.notifications ?? []);
    } catch {
      showToast('Failed to load notifications', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sendOne(id: string) {
    setSending(id);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_one', id }),
      });
      const json = await res.json();
      if (res.ok) { showToast('Email sent \u2714'); load(); }
      else showToast(json.error ?? 'Failed to send', false);
    } catch {
      showToast('Network error', false);
    } finally {
      setSending(null);
    }
  }

  async function sendAll() {
    const pending = entries.filter(e => !e.notified);
    if (!pending.length) return;
    if (!confirm(`Send emails to ${pending.length} customer(s)?`)) return;
    setSendingAll(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_all_pending' }),
      });
      const json = await res.json();
      if (res.ok) { showToast(`Sent ${json.sent} email(s) \u2714`); load(); }
      else showToast(json.error ?? 'Failed', false);
    } catch {
      showToast('Network error', false);
    } finally {
      setSendingAll(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this notification request?')) return;
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast('Deleted'); load(); }
      else showToast('Failed to delete', false);
    } catch {
      showToast('Network error', false);
    }
  }

  const q = search.toLowerCase();
  const filtered = entries
    .filter(e => filter === 'all' ? true : filter === 'pending' ? !e.notified : e.notified)
    .filter(e => typeFilter === 'all' ? true : (e.notify_type ?? 'restock') === typeFilter)
    .filter(e =>
      !q ||
      e.email.toLowerCase().includes(q) ||
      e.product_name.toLowerCase().includes(q) ||
      (e.size        ?? '').toLowerCase().includes(q) ||
      (e.colour      ?? '').toLowerCase().includes(q) ||
      (e.notify_type ?? '').toLowerCase().includes(q)
    );

  const pendingCount  = entries.filter(e => !e.notified).length;
  const notifiedCount = entries.filter(e => e.notified).length;
  const restockCount  = entries.filter(e => (e.notify_type ?? 'restock') === 'restock').length;
  const csCount       = entries.filter(e => e.notify_type === 'coming_soon').length;

  const card: React.CSSProperties = {
    background: 'white',
    borderRadius: '.75rem',
    border: '1.5px solid #fce7f3',
    padding: '1.5rem',
    marginBottom: '1.25rem',
  };

  function pill(text: string, bg: string, color: string) {
    return (
      <span style={{ background: bg, color, borderRadius: '2rem', padding: '.2rem .6rem', fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {text}
      </span>
    );
  }

  return (
    <div style={{ maxWidth: 1080 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '4.5rem', right: '1.25rem', zIndex: 999,
          background: toast.ok ? '#166534' : '#991b1b',
          color: 'white', borderRadius: '.6rem',
          padding: '.65rem 1.1rem', fontSize: '.85rem', fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,.18)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f2937', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ margin: '.25rem 0 0', fontSize: '.83rem', color: '#6b7280' }}>
            Customers waiting to be notified about restocks &amp; launches
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>
          <button onClick={load}
            style={{ padding: '.45rem .9rem', borderRadius: '.5rem', border: '1.5px solid #fce7f3', background: 'white', fontSize: '.82rem', cursor: 'pointer', color: '#6b7280', fontWeight: 600 }}>
            \u21bb Refresh
          </button>
          {pendingCount > 0 && (
            <button onClick={sendAll} disabled={sendingAll}
              style={{ padding: '.45rem .9rem', borderRadius: '.5rem', border: 'none', background: sendingAll ? '#d1d5db' : '#9d174d', color: 'white', fontSize: '.82rem', cursor: sendingAll ? 'default' : 'pointer', fontWeight: 700 }}>
              {sendingAll ? 'Sending...' : `Notify All Pending (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',       value: entries.length, color: '#9d174d' },
          { label: 'Pending',     value: pendingCount,   color: '#d97706' },
          { label: 'Notified',    value: notifiedCount,  color: '#059669' },
          { label: 'Restock',     value: restockCount,   color: '#9d174d' },
          { label: 'Coming Soon', value: csCount,        color: '#1e40af' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '1rem', marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.72rem', color: '#6b7280', fontWeight: 600, marginTop: '.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div style={{ ...card, padding: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {(['pending', 'notified', 'all'] as FilterStatus[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '.35rem .85rem', borderRadius: '2rem',
                border: '1.5px solid', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
                borderColor: filter === f ? '#9d174d' : '#e5e7eb',
                background:  filter === f ? '#9d174d' : 'white',
                color:       filter === f ? 'white'   : '#6b7280',
                textTransform: 'capitalize',
              }}>
              {f}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {([
            { key: 'all',         label: 'All types' },
            { key: 'restock',     label: '\ud83d\udd14 Restock' },
            { key: 'coming_soon', label: '\ud83d\ude80 Coming Soon' },
          ] as { key: FilterType; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              style={{
                padding: '.35rem .85rem', borderRadius: '2rem',
                border: '1.5px solid', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
                borderColor: typeFilter === f.key ? '#1e40af' : '#e5e7eb',
                background:  typeFilter === f.key ? '#dbeafe' : 'white',
                color:       typeFilter === f.key ? '#1e40af' : '#6b7280',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search email, product, size, colour..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '180px',
            padding: '.4rem .75rem', borderRadius: '.5rem',
            border: '1.5px solid #e5e7eb', fontSize: '.83rem',
            outline: 'none', fontFamily: 'system-ui',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '.9rem' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '.9rem' }}>
            {filter === 'pending' ? '\u2714 No pending notifications' : 'No results found'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.83rem' }}>
              <thead>
                <tr style={{ background: '#fdf2f8', borderBottom: '1.5px solid #fce7f3' }}>
                  {['Email', 'Product', 'Type', 'Colour', 'Size', 'Requested', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const typeMeta = TYPE_META[e.notify_type ?? 'restock'] ?? TYPE_META.restock;
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid #fce7f3', background: i % 2 === 0 ? 'white' : '#fffbfe' }}>
                      <td style={{ padding: '.7rem 1rem', color: '#1f2937', fontWeight: 500 }}>{e.email}</td>
                      <td style={{ padding: '.7rem 1rem', color: '#374151' }}>
                        {e.product_slug ? (
                          <a href={`/products/${e.product_slug}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#9d174d', textDecoration: 'none', fontWeight: 600 }}>
                            {e.product_name}
                          </a>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{e.product_name}</span>
                        )}
                      </td>
                      <td style={{ padding: '.7rem 1rem' }}>
                        {pill(typeMeta.label, typeMeta.bg, typeMeta.color)}
                      </td>
                      <td style={{ padding: '.7rem 1rem' }}>
                        {e.colour
                          ? pill(e.colour, '#fce7f3', '#9d174d')
                          : <span style={{ color: '#d1d5db', fontSize: '.75rem' }}>&mdash;</span>}
                      </td>
                      <td style={{ padding: '.7rem 1rem' }}>
                        {e.size
                          ? pill(e.size, '#ede9fe', '#5b21b6')
                          : <span style={{ color: '#d1d5db', fontSize: '.75rem' }}>&mdash;</span>}
                      </td>
                      <td style={{ padding: '.7rem 1rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {new Date(e.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '.7rem 1rem' }}>
                        {e.notified ? (
                          <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: '2rem', padding: '.2rem .65rem', fontSize: '.75rem', fontWeight: 700 }}>
                            \u2714 Notified
                          </span>
                        ) : (
                          <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '2rem', padding: '.2rem .65rem', fontSize: '.75rem', fontWeight: 700 }}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '.7rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '.4rem' }}>
                          {!e.notified && (
                            <button onClick={() => sendOne(e.id)} disabled={sending === e.id}
                              style={{ padding: '.3rem .65rem', borderRadius: '.4rem', border: 'none', background: sending === e.id ? '#d1d5db' : '#9d174d', color: 'white', fontSize: '.75rem', fontWeight: 700, cursor: sending === e.id ? 'default' : 'pointer' }}>
                              {sending === e.id ? '...' : 'Send'}
                            </button>
                          )}
                          <button onClick={() => deleteEntry(e.id)}
                            style={{ padding: '.3rem .65rem', borderRadius: '.4rem', border: '1.5px solid #fce7f3', background: 'white', color: '#ef4444', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
