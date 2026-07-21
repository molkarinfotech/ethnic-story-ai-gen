'use client';
import { useEffect, useState } from 'react';

type Provider = {
  id: string;
  name: string;
  tracking_url_template: string | null;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: 8, fontSize: '.9rem', fontFamily: 'inherit',
  boxSizing: 'border-box', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4,
};

function ProviderForm({
  initial, onSave, onCancel,
}: {
  initial?: Provider;
  onSave: (name: string, template: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [template, setTemplate] = useState(initial?.tracking_url_template ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const preview = template && name
    ? template.replace('{tracking_number}', 'EXAMPLE123')
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Provider name is required'); return; }
    setSaving(true); setErr('');
    try {
      await onSave(name.trim(), template.trim());
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Provider name *</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Australia Post" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Tracking URL template</label>
        <input value={template} onChange={e => setTemplate(e.target.value)}
          placeholder="https://auspost.com.au/mypost/track/#/search?trackingId={tracking_number}"
          style={inputStyle} />
        <div style={{ fontSize: '.72rem', color: '#9ca3af', marginTop: 4 }}>
          Use <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>{'{tracking_number}'}</code> as the placeholder — it will be replaced with the actual tracking number.
        </div>
        {preview && (
          <div style={{ marginTop: 6, fontSize: '.75rem' }}>
            Preview:&nbsp;
            <a href={preview} target="_blank" rel="noopener noreferrer"
              style={{ color: '#2563eb', wordBreak: 'break-all' }}>
              {preview}
            </a>
          </div>
        )}
      </div>
      {err && <div style={{ color: '#991b1b', fontSize: '.82rem' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 8, background: '#9d174d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add provider'}
        </button>
      </div>
    </form>
  );
}

export default function ShippingProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/shipping-providers');
    if (res.ok) setProviders(await res.json());
    else setErr('Failed to load providers');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(name: string, tracking_url_template: string) {
    const res = await fetch('/api/admin/shipping-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tracking_url_template }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
    setShowAdd(false);
    await load();
  }

  async function handleEdit(name: string, tracking_url_template: string) {
    if (!editing) return;
    const res = await fetch('/api/admin/shipping-providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, name, tracking_url_template }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this shipping provider?')) return;
    setDeleting(id);
    await fetch(`/api/admin/shipping-providers?id=${id}`, { method: 'DELETE' });
    setDeleting(null);
    await load();
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: "'Helvetica Neue', Arial, sans-serif", maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#9d174d', margin: 0, fontSize: '1.5rem' }}>Shipping Providers</h1>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '.82rem' }}>
            Manage carriers and their tracking URL templates. Used in order management.
          </p>
        </div>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setEditing(null); }}
            style={{ padding: '9px 18px', background: '#9d174d', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.85rem' }}>
            + Add provider
          </button>
        )}
      </div>

      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '.85rem' }}>{err}</div>}

      {showAdd && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af', marginBottom: '1rem' }}>New provider</div>
          <ProviderForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>Loading…</div>
      ) : providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🚚</div>
          <p style={{ fontWeight: 600 }}>No shipping providers yet</p>
          <p style={{ fontSize: '.85rem' }}>Add your first carrier to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {providers.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
              {editing?.id === p.id ? (
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af', marginBottom: '1rem' }}>Edit provider</div>
                  <ProviderForm initial={p} onSave={handleEdit} onCancel={() => setEditing(null)} />
                </div>
              ) : (
                <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>🚚 {p.name}</div>
                    {p.tracking_url_template ? (
                      <div style={{ fontSize: '.78rem', color: '#9ca3af', marginTop: 4, wordBreak: 'break-all' }}>
                        <span style={{ color: '#6b7280', fontWeight: 600 }}>Template: </span>
                        {p.tracking_url_template}
                      </div>
                    ) : (
                      <div style={{ fontSize: '.78rem', color: '#d1d5db', marginTop: 4, fontStyle: 'italic' }}>No tracking URL configured</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => { setEditing(p); setShowAdd(false); }}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem', color: '#374151' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem', color: '#dc2626', opacity: deleting === p.id ? .5 : 1 }}>
                      {deleting === p.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
