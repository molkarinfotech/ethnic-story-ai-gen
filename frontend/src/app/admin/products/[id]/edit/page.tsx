'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductFields, CategoryOption } from '../../../../../components/admin/ProductFields';

type ProductRow = Record<string, string | number | null>;

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [form,       setForm]       = useState<Record<string, string>>({
    slug: '', name: '', subtitle: '', price: '', original_price: '',
    category: '', gender: 'women', badge: '', image: '',
  });

  // Unwrap params safely for Next.js 14 and 15
  useEffect(() => {
    if (params && typeof (params as Promise<{ id: string }>).then === 'function') {
      (params as Promise<{ id: string }>).then(p => setProductId(p.id));
    } else {
      setProductId((params as { id: string }).id);
    }
  }, [params]);

  useEffect(() => {
    if (!productId) return;
    Promise.all([
      fetch('/api/admin/categories', { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/admin/products/${productId}`, { credentials: 'include' }).then(r => r.json()),
    ]).then(([cats, p]: [CategoryOption[], ProductRow]) => {
      const safeCategories = Array.isArray(cats) ? cats : [];
      setCategories(safeCategories);
      if (p && !('error' in p)) {
        setForm({
          slug:           String(p.slug           ?? ''),
          name:           String(p.name           ?? ''),
          subtitle:       String(p.subtitle       ?? ''),
          price:          String(p.price          ?? ''),
          original_price: String(p.original_price ?? ''),
          category:       String(p.category       ?? (safeCategories[0]?.slug ?? '')),
          gender:         String(p.gender         ?? 'women'),
          badge:          String(p.badge          ?? ''),
          image:          String(p.image          ?? ''),
        });
      }
    }).catch(console.error);
  }, [productId]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
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
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push(`/admin/products/${productId}/inventory`);
      } else {
        const d = await res.json();
        setError(d.error ?? 'Failed to update product.');
        setSaving(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update.');
      setSaving(false);
    }
  }

  if (!productId) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '.875rem' }}>Loading…</div>;
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <a href={`/admin/products/${productId}/inventory`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to inventory</a>
        </div>
        <div style={{ background: 'white', borderRadius: '.75rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Edit product</h1>
          <form onSubmit={handleSubmit}>
            <ProductFields
              form={form}
              set={set}
              categories={categories}
              onCategoryCreated={(cat) => {
                setCategories(prev => [...prev, cat]);
                set('category', cat.slug);
              }}
            />
            {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem' }}>
              <button type="submit" disabled={saving} className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', minHeight: '44px' }}>
                {saving ? 'Saving…' : 'Update product'}
              </button>
              <a href={`/admin/products/${productId}/inventory`} className="btn btn--outline"
                style={{ flex: 1, justifyContent: 'center', minHeight: '44px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
