'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductFields } from '../../../../../components/admin/ProductFields';

type ProductRow = Record<string, string | number | null>;

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, string>>({
    slug: '', name: '', subtitle: '', price: '', original_price: '',
    category: 'sarees', gender: 'women', badge: '', image: '',
  });

  useEffect(() => {
    fetch('/api/admin/products')
      .then(r => r.json())
      .then((products: ProductRow[]) => {
        const p = products.find(x => x.id === params.id);
        if (p) setForm({
          slug:           String(p.slug           ?? ''),
          name:           String(p.name           ?? ''),
          subtitle:       String(p.subtitle       ?? ''),
          price:          String(p.price          ?? ''),
          original_price: String(p.original_price ?? ''),
          category:       String(p.category       ?? 'sarees'),
          gender:         String(p.gender         ?? 'women'),
          badge:          String(p.badge          ?? ''),
          image:          String(p.image          ?? ''),
        });
      });
  }, [params.id]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      price:          parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      badge:          form.badge    || null,
      subtitle:       form.subtitle || null,
      image:          form.image    || null,
      gender:         form.gender   || 'women',
    };
    const res = await fetch(`/api/admin/products/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push('/admin');
    } else {
      const d = await res.json();
      setError(d.error ?? 'Failed to update product.');
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <a href="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to dashboard</a>
        </div>
        <div style={{ background: 'white', borderRadius: '.75rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Edit product</h1>
          <form onSubmit={handleSubmit}>
            <ProductFields form={form} set={set} />
            {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem' }}>
              <button type="submit" disabled={saving} className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', minHeight: '44px' }}>
                {saving ? 'Saving…' : 'Update product'}
              </button>
              <a href="/admin" className="btn btn--outline"
                style={{ flex: 1, justifyContent: 'center', minHeight: '44px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
