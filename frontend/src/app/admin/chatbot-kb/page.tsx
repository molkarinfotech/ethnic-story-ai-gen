'use client';
import { useState, useEffect, useCallback } from 'react';

type KbEntry = {
  id: string;
  topic: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
};

const CARD: React.CSSProperties = {
  background: 'white',
  borderRadius: '1rem',
  border: '1.5px solid #fce7f3',
  padding: '1.5rem',
  boxShadow: '0 1px 4px rgba(0,0,0,.04)',
};

const BTN = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '.4rem',
  padding: '.5rem 1.1rem',
  borderRadius: '.55rem',
  fontSize: '.82rem', fontWeight: 600,
  cursor: 'pointer',
  border: variant === 'ghost' ? '1.5px solid #fce7f3' : 'none',
  background: variant === 'primary' ? '#9d174d' : variant === 'danger' ? '#fff1f2' : 'white',
  color: variant === 'primary' ? 'white' : variant === 'danger' ? '#e11d48' : '#374151',
  transition: 'opacity .12s',
});

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '.6rem .85rem',
  borderRadius: '.55rem',
  border: '1.5px solid #fce7f3',
  fontSize: '.85rem',
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fdf2f8',
  color: '#111827',
};

const TEXTAREA: React.CSSProperties = {
  ...INPUT,
  minHeight: '120px',
  resize: 'vertical',
};

const EMPTY_FORM = { topic: '', content: '', tags: '' };

export default function ChatbotKbPage() {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KbEntry | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/chatbot-kb');
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      showToast('Failed to load KB entries', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(entry: KbEntry) {
    setEditing(entry);
    setForm({ topic: entry.topic, content: entry.content, tags: entry.tags });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.topic.trim() || !form.content.trim()) {
      showToast('Topic and content are required', false);
      return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch('/api/admin/chatbot-kb', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast(editing ? 'Entry updated' : 'Entry created');
      setShowForm(false);
      load();
    } catch {
      showToast('Save failed', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this KB entry?')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/chatbot-kb', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      showToast('Entry deleted');
      load();
    } catch {
      showToast('Delete failed', false);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = entries.filter(e =>
    e.topic.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase()) ||
    e.tags.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 100,
          background: toast.ok ? '#9d174d' : '#e11d48',
          color: 'white', borderRadius: '.6rem',
          padding: '.65rem 1.2rem', fontSize: '.85rem', fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,.18)',
          animation: 'fadeIn .2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', margin: 0 }}>🤖 Chatbot Knowledge Base</h1>
          <p style={{ margin: '.3rem 0 0', fontSize: '.82rem', color: '#6b7280' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · Manage FAQs, policies and product info the chatbot uses to answer customers.
          </p>
        </div>
        <button style={BTN('primary')} onClick={openCreate}>＋ New Entry</button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <span style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '.9rem', pointerEvents: 'none' }}>🔍</span>
        <input
          style={{ ...INPUT, paddingLeft: '2.2rem' }}
          placeholder="Search by topic, content or tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ ...CARD, width: '100%', maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{editing ? 'Edit Entry' : 'New KB Entry'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Topic *</label>
                <input
                  style={INPUT}
                  placeholder="e.g. Shipping policy, Return process, Saree sizing…"
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Content *</label>
                <textarea
                  style={TEXTAREA}
                  placeholder="Write the answer or information the chatbot should know about this topic…"
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: '.3rem' }}>Tags <span style={{ fontWeight: 400, color: '#9ca3af' }}>(comma-separated)</span></label>
                <input
                  style={INPUT}
                  placeholder="e.g. shipping, returns, sizing"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: '.65rem', justifyContent: 'flex-end', marginTop: '.25rem' }}>
                <button style={BTN('ghost')} onClick={() => setShowForm(false)}>Cancel</button>
                <button style={BTN('primary')} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Create entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Loading entries…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...CARD, textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          {search ? 'No entries match your search.' : 'No KB entries yet. Click "＋ New Entry" to get started.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          {filtered.map(entry => (
            <div key={entry.id} style={CARD}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827' }}>{entry.topic}</span>
                    {entry.tags && entry.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} style={{
                        background: '#fdf2f8', color: '#9d174d',
                        borderRadius: '.35rem', padding: '.1rem .55rem',
                        fontSize: '.7rem', fontWeight: 600,
                      }}>{tag}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: '.82rem', color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                    {entry.content.length > 220 ? entry.content.slice(0, 220) + '…' : entry.content}
                  </p>
                  <p style={{ fontSize: '.7rem', color: '#9ca3af', margin: '.5rem 0 0' }}>
                    Updated {new Date(entry.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                  <button style={BTN('ghost')} onClick={() => openEdit(entry)}>✏️ Edit</button>
                  <button
                    style={BTN('danger')}
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                  >
                    {deletingId === entry.id ? '…' : '🗑'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
