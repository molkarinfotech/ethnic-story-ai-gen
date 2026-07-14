'use client';
import { useState, useEffect, useCallback } from 'react';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  max_uses: '',
  expires_at: '',
  active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons]     = useState<Coupon[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [filter, setFilter]       = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch]       = useState('');

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/coupons');
      const json = await res.json();
      setCoupons(json.coupons ?? []);
    } catch {
      showToast('Failed to load coupons', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(c: Coupon) {
    setEditId(c.id);
    setForm({
      code:             c.code,
      description:      c.description ?? '',
      discount_type:    c.discount_type,
      discount_value:   String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : '',
      max_uses:         c.max_uses ? String(c.max_uses) : '',
      expires_at:       c.expires_at ? c.expires_at.slice(0, 10) : '',
      active:           c.active,
    });
    setFormError('');
    setShowForm(true);
  }

  async function saveForm() {
    if (!form.code.trim())          { setFormError('Code is required.'); return; }
    if (!form.discount_value)       { setFormError('Discount value is required.'); return; }
    if (Number(form.discount_value) <= 0) { setFormError('Discount value must be greater than 0.'); return; }
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100)
      { setFormError('Percentage discount cannot exceed 100%.'); return; }

    setSaving(true);
    setFormError('');
    const payload = {
      code:             form.code.trim().toUpperCase(),
      description:      form.description.trim() || null,
      discount_type:    form.discount_type,
      discount_value:   Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_uses:         form.max_uses ? Number(form.max_uses) : null,
      expires_at:       form.expires_at ? new Date(form.expires_at).toISOString() : null,
      active:           form.active,
    };

    try {
      const res = editId
        ? await fetch('/api/admin/coupons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...payload }) })
        : await fetch('/api/admin/coupons', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? 'Save failed.'); return; }
      showToast(editId ? 'Coupon updated ✔' : 'Coupon created ✔');
      setShowForm(false);
      load();
    } catch {
      setFormError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Coupon) {
    try {
      await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, active: !c.active }),
      });
      showToast(c.active ? 'Coupon deactivated' : 'Coupon activated');
      load();
    } catch { showToast('Failed to update', false); }
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast('Coupon deleted'); load(); }
      else showToast('Failed to delete', false);
    } catch { showToast('Network error', false); }
  }

  const q = search.toLowerCase();
  const filtered = coupons
    .filter(c => filter === 'all' ? true : filter === 'active' ? c.active : !c.active)
    .filter(c => !q || c.code.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q));

  const activeCount   = coupons.filter(c => c.active).length;
  const inactiveCount = coupons.filter(c => !c.active).length;

  function formatDiscount(c: Coupon) {
    return c.discount_type === 'percentage' ? `${c.discount_value}% off` : `$${c.discount_value.toFixed(2)} off`;
  }

  function isExpired(c: Coupon) {
    return !!c.expires_at && new Date(c.expires_at) < new Date();
  }

  const card: React.CSSProperties = {
    background: 'white', borderRadius: '.75rem',
    border: '1.5px solid #fce7f3', padding: '1.5rem', marginBottom: '1.25rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '.45rem .75rem',
    border: '1.5px solid #e5e7eb', borderRadius: '.5rem',
    fontSize: '.85rem', fontFamily: 'system-ui', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '.75rem', fontWeight: 700,
    color: '#374151', marginBottom: '.3rem', textTransform: 'uppercase', letterSpacing: '.04em',
  };

  return (
    <div style={{ maxWidth: 960 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '4.5rem', right: '1.25rem', zIndex: 999,
          background: toast.ok ? '#166534' : '#991b1b', color: 'white',
          borderRadius: '.6rem', padding: '.65rem 1.1rem',
          fontSize: '.85rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.18)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modal / form overlay */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{
            background: 'white', borderRadius: '1rem', padding: '2rem',
            width: '100%', maxWidth: '540px', maxHeight: '90dvh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f2937', margin: 0 }}>
                {editId ? 'Edit Coupon' : 'Create Coupon'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ fontSize: '1.25rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Code *</label>
                <input
                  style={{ ...inputStyle, letterSpacing: '.08em', fontWeight: 700, textTransform: 'uppercase' }}
                  placeholder="SUMMER20"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description (shown to customer)</label>
                <input
                  style={inputStyle}
                  placeholder="20% off your order"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label style={labelStyle}>Discount Type *</label>
                <select
                  style={inputStyle}
                  value={form.discount_type}
                  onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  {form.discount_type === 'percentage' ? 'Percentage (1–100) *' : 'Amount ($) *'}
                </label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0.01"
                  max={form.discount_type === 'percentage' ? 100 : undefined}
                  step="0.01"
                  placeholder={form.discount_type === 'percentage' ? '20' : '15.00'}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                />
              </div>

              <div>
                <label style={labelStyle}>Min. Order Amount ($)</label>
                <input
                  style={inputStyle} type="number" min="0" step="0.01" placeholder="50.00"
                  value={form.min_order_amount}
                  onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                />
              </div>

              <div>
                <label style={labelStyle}>Max Uses (blank = unlimited)</label>
                <input
                  style={inputStyle} type="number" min="1" step="1" placeholder="100"
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                />
              </div>

              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input
                  style={inputStyle} type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingTop: '1.5rem' }}>
                <input
                  id="coupon-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#9d174d', cursor: 'pointer' }}
                />
                <label htmlFor="coupon-active" style={{ ...labelStyle, margin: 0, cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal' }}>
                  Active (available at checkout)
                </label>
              </div>

            </div>

            {formError && (
              <div style={{ marginTop: '1rem', padding: '.65rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '.5rem', fontSize: '.83rem', color: '#991b1b' }}>
                {formError}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '.5rem 1.1rem', borderRadius: '.5rem', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '.85rem', cursor: 'pointer', color: '#6b7280', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={saving}
                style={{ padding: '.5rem 1.4rem', borderRadius: '.5rem', border: 'none', background: saving ? '#d1d5db' : '#9d174d', color: 'white', fontSize: '.85rem', fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}
              >
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f2937', margin: 0 }}>🏷️ Coupons & Promotions</h1>
          <p style={{ margin: '.25rem 0 0', fontSize: '.83rem', color: '#6b7280' }}>Create and manage discount codes for customers</p>
        </div>
        <div style={{ display: 'flex', gap: '.65rem' }}>
          <button onClick={load} style={{ padding: '.45rem .9rem', borderRadius: '.5rem', border: '1.5px solid #fce7f3', background: 'white', fontSize: '.82rem', cursor: 'pointer', color: '#6b7280', fontWeight: 600 }}>↻ Refresh</button>
          <button onClick={openCreate} style={{ padding: '.45rem 1rem', borderRadius: '.5rem', border: 'none', background: '#9d174d', color: 'white', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer' }}>+ New Coupon</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Coupons', value: coupons.length,  color: '#9d174d' },
          { label: 'Active',        value: activeCount,     color: '#059669' },
          { label: 'Inactive',      value: inactiveCount,   color: '#9ca3af' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '1rem', marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.75rem', color: '#6b7280', fontWeight: 600, marginTop: '.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div style={{ ...card, padding: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '.35rem .85rem', borderRadius: '2rem',
              border: '1.5px solid', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
              borderColor: filter === f ? '#9d174d' : '#e5e7eb',
              background:  filter === f ? '#9d174d' : 'white',
              color:       filter === f ? 'white'   : '#6b7280',
              textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
        <input
          type="text" placeholder="Search code or description…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '180px', padding: '.4rem .75rem', borderRadius: '.5rem', border: '1.5px solid #e5e7eb', fontSize: '.83rem', outline: 'none', fontFamily: 'system-ui' }}
        />
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '.9rem' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '.9rem' }}>
            {coupons.length === 0 ? 'No coupons yet — create your first one above.' : 'No results found.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.83rem' }}>
              <thead>
                <tr style={{ background: '#fdf2f8', borderBottom: '1.5px solid #fce7f3' }}>
                  {['Code', 'Discount', 'Min. Order', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #fce7f3', background: i % 2 === 0 ? 'white' : '#fffbfe' }}>
                    <td style={{ padding: '.7rem 1rem' }}>
                      <div style={{ fontWeight: 800, letterSpacing: '.06em', color: '#1f2937', fontFamily: 'monospace', fontSize: '.9rem' }}>{c.code}</div>
                      {c.description && <div style={{ fontSize: '.75rem', color: '#6b7280', marginTop: '2px' }}>{c.description}</div>}
                    </td>
                    <td style={{ padding: '.7rem 1rem', fontWeight: 700, color: '#9d174d' }}>{formatDiscount(c)}</td>
                    <td style={{ padding: '.7rem 1rem', color: '#6b7280' }}>
                      {c.min_order_amount ? `$${c.min_order_amount.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '.7rem 1rem', color: '#374151' }}>
                      <span style={{ fontWeight: 600 }}>{c.used_count}</span>
                      {c.max_uses ? <span style={{ color: '#6b7280', fontWeight: 400 }}> / {c.max_uses}</span> : <span style={{ color: '#9ca3af' }}> / ∞</span>}
                    </td>
                    <td style={{ padding: '.7rem 1rem', color: isExpired(c) ? '#dc2626' : '#6b7280', whiteSpace: 'nowrap' }}>
                      {c.expires_at
                        ? <>{isExpired(c) ? '⚠️ ' : ''}{new Date(c.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}</>
                        : '—'}
                    </td>
                    <td style={{ padding: '.7rem 1rem' }}>
                      <button
                        onClick={() => toggleActive(c)}
                        style={{
                          padding: '.2rem .65rem', borderRadius: '2rem', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', border: 'none',
                          background: c.active && !isExpired(c) ? '#d1fae5' : '#f3f4f6',
                          color:      c.active && !isExpired(c) ? '#065f46' : '#6b7280',
                        }}
                      >
                        {c.active && !isExpired(c) ? '✔ Active' : isExpired(c) ? '⏰ Expired' : '✕ Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '.7rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button
                          onClick={() => openEdit(c)}
                          style={{ padding: '.3rem .65rem', borderRadius: '.4rem', border: '1.5px solid #fce7f3', background: 'white', color: '#9d174d', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteCoupon(c.id, c.code)}
                          style={{ padding: '.3rem .65rem', borderRadius: '.4rem', border: '1.5px solid #fce7f3', background: 'white', color: '#ef4444', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
