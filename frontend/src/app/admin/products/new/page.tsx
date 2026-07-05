'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductFields, CategoryOption } from '../../../../components/admin/ProductFields';

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    slug: '', name: '', subtitle: '', price: '', original_price: '',
    category: '', gender: 'women', badge: '', image: '',
  });

  useEffect(() => {
    fetch('/api/admin/categories', { credentials: 'include' })
      .then(r => r.json())
      .then((cats: CategoryOption[]) => {
        if (!Array.isArray(cats)) return;
        setCategories(cats);
        if (cats.length > 0) setForm(f => ({ ...f, category: f.category || cats[0].slug }));
      })
      .catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'name' && !f.slug) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { setError('A valid price is required.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      ...form,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      badge: form.badge || null,
      subtitle: form.subtitle || null,
      image: form.image || null,
      gender: form.gender || 'women',
    };

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let created: Record<string, unknown> = {};
      try { created = await res.json(); } catch {
        setSaving(false);
        setError(`Server error (${res.status}). Please try again.`);
        return;
      }

      if (!res.ok) {
        setSaving(false);
        setError((created?.error as string) ?? `Failed to save product (${res.status}).`);
        return;
      }

      // Navigate back to products list — admin clicks 📸 Manage to open inventory
      router.replace('/admin/products');
    } catch (err: unknown) {
      setSaving(false);
      setError(err instanceof Error ? err.message : 'Network error — failed to save product.');
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <a href="/admin/products" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to products</a>
        </div>
        <div style={{ background: 'white', borderRadius: '.75rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add new product</h1>
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
            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '.4rem', padding: '.5rem .75rem' }}>
                ⚠ {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', minHeight: '44px', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : 'Save product'}
              </button>
              <a
                href="/admin/products"
                className="btn btn--outline"
                style={{ flex: 1, justifyContent: 'center', minHeight: '44px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                Cancel
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
