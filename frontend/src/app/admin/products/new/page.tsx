'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['sarees', 'lehengas', 'kurtas', 'kids'];
const BADGES = ['', 'Bestseller', 'New', 'Sale', 'Premium', 'Test'];

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    slug: '', name: '', subtitle: '', price: '', original_price: '',
    category: 'sarees', badge: '', image: '',
  });

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (field === 'name' && !form.slug) {
      setForm(f => ({ ...f, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      badge: form.badge || null,
      subtitle: form.subtitle || null,
      image: form.image || null,
    };
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push('/admin');
    } else {
      const d = await res.json();
      setError(d.error ?? 'Failed to save product.');
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <a href="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to dashboard</a>
        </div>
        <div style={{ background: 'white', borderRadius: '.75rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add new product</h1>
          <form onSubmit={handleSubmit}>
            <ProductFields form={form} set={set} />
            {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem' }}>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minHeight: '44px' }}>
                {saving ? 'Saving…' : 'Save product'}
              </button>
              <a href="/admin" className="btn btn--outline" style={{ flex: 1, justifyContent: 'center', minHeight: '44px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export function ProductFields({ form, set }: { form: Record<string, string>; set: (f: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[
        { id: 'name', label: 'Product name *', placeholder: 'Banarasi Silk Saree', required: true },
        { id: 'slug', label: 'URL slug *', placeholder: 'banarasi-silk-saree', required: true },
        { id: 'subtitle', label: 'Subtitle', placeholder: 'Pure silk with gold zari border' },
        { id: 'price', label: 'Price (AUD) *', placeholder: '189', type: 'number', required: true },
        { id: 'original_price', label: 'Original price (AUD)', placeholder: '229', type: 'number' },
        { id: 'image', label: 'Image URL', placeholder: 'https://…' },
      ].map(f => (
        <div key={f.id} className="checkout-field">
          <label className="checkout-label">{f.label}</label>
          <input
            type={f.type ?? 'text'}
            className="checkout-input"
            placeholder={f.placeholder}
            value={form[f.id]}
            onChange={e => set(f.id, e.target.value)}
            required={f.required}
            step={f.type === 'number' ? '0.01' : undefined}
          />
        </div>
      ))}
      <div className="checkout-field">
        <label className="checkout-label">Category *</label>
        <select className="checkout-input" value={form.category} onChange={e => set('category', e.target.value)} required>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>
      <div className="checkout-field">
        <label className="checkout-label">Badge</label>
        <select className="checkout-input" value={form.badge} onChange={e => set('badge', e.target.value)}>
          {BADGES.map(b => <option key={b} value={b}>{b || '— None —'}</option>)}
        </select>
      </div>
    </div>
  );
}
