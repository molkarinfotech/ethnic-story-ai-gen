'use client';
import { useState } from 'react';

const GENDERS = ['women', 'men', 'kids', 'unisex'];
const BADGES  = [
  '',
  'Bestseller',
  'New',
  'Sale',
  'Premium',
  'Coming Soon',
  'Pre-Order',
  'Limited Edition',
  'Sold Out',
  'Staff Pick',
  'Test',
];

export type CategoryOption = { slug: string; label: string };

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function ProductFields({
  form,
  set,
  categories,
  onCategoryCreated,
}: {
  form: Record<string, string>;
  set: (field: string, value: string) => void;
  categories: CategoryOption[];
  onCategoryCreated?: (cat: CategoryOption) => void;
}) {
  const isAccessories = form.category === 'accessories';

  const [showNewCat,  setShowNewCat]  = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatSlug,  setNewCatSlug]  = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [catError,    setCatError]    = useState('');

  function handleCatLabelChange(val: string) {
    setNewCatLabel(val);
    if (!slugTouched) setNewCatSlug(slugify(val));
  }

  async function handleCreateCategory() {
    if (!newCatLabel.trim() || !newCatSlug.trim()) {
      setCatError('Both name and slug are required.');
      return;
    }
    setCreatingCat(true);
    setCatError('');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newCatSlug.trim(), label: newCatLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create category');
      const newCat: CategoryOption = { slug: data.slug, label: data.label };
      onCategoryCreated?.(newCat);
      setShowNewCat(false);
      setNewCatLabel('');
      setNewCatSlug('');
      setSlugTouched(false);
    } catch (e: unknown) {
      setCatError(e instanceof Error ? e.message : 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  }

  /* ── helpers ── */
  function cancelNewCat() {
    setShowNewCat(false);
    setNewCatLabel('');
    setNewCatSlug('');
    setSlugTouched(false);
    setCatError('');
    if (!showNewCat) return;
    // restore selection to first real category (or keep current)
    if (categories.length > 0 && !categories.find(c => c.slug === form.category)) {
      set('category', categories[0].slug);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Text fields */}
      {([
        { id: 'name',           label: 'Product name *',       placeholder: 'Banarasi Silk Saree',            required: true },
        { id: 'slug',           label: 'URL slug *',            placeholder: 'banarasi-silk-saree',            required: true },
        { id: 'subtitle',       label: 'Subtitle',              placeholder: 'Pure silk with gold zari border' },
        { id: 'price',          label: 'Price (AUD) *',         placeholder: '189', type: 'number',            required: true },
        { id: 'original_price', label: 'Original price (AUD)', placeholder: '229', type: 'number'            },
      ] as const).map(f => (
        <div key={f.id} className="checkout-field">
          <label className="checkout-label">{f.label}</label>
          <input
            type={'type' in f ? f.type : 'text'}
            className="checkout-input"
            placeholder={f.placeholder}
            value={form[f.id] ?? ''}
            onChange={e => set(f.id, e.target.value)}
            required={'required' in f ? f.required : false}
            step={'type' in f && f.type === 'number' ? '0.01' : undefined}
          />
        </div>
      ))}

      {/* Gender + Category row */}
      <div style={{ display: 'grid', gridTemplateColumns: isAccessories ? '1fr' : '1fr 1fr', gap: '.75rem' }}>

        {!isAccessories && (
          <div className="checkout-field">
            <label className="checkout-label">Gender *</label>
            <select
              className="checkout-input"
              value={form.gender ?? 'women'}
              onChange={e => set('gender', e.target.value)}
              required
            >
              {GENDERS.map(g => (
                <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="checkout-field">
          <label className="checkout-label">Category *</label>
          <select
            className="checkout-input"
            value={showNewCat ? '__new__' : (form.category || '')}
            onChange={e => {
              if (e.target.value === '__new__') {
                setShowNewCat(true);
              } else {
                setShowNewCat(false);
                set('category', e.target.value);
              }
            }}
            required={!showNewCat}
          >
            {/* Always show a placeholder when list is empty */}
            {categories.length === 0 && (
              <option value="" disabled>Loading categories…</option>
            )}
            {categories.map(c => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
            {/* This option is ALWAYS present — never inside a conditional */}
            <option value="__new__">✚ New category…</option>
          </select>
        </div>
      </div>

      {/* ── Inline new-category panel ── */}
      {showNewCat && (
        <div style={{
          background: '#f5f3ff',
          border: '1px solid #ede9fe',
          borderRadius: '.65rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '.65rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#7c3aed' }}>✨ Create new category</div>

          <div className="checkout-field" style={{ margin: 0 }}>
            <label className="checkout-label" style={{ fontSize: '.75rem' }}>Display name *</label>
            <input
              className="checkout-input"
              placeholder="e.g. Kurtis"
              value={newCatLabel}
              onChange={e => handleCatLabelChange(e.target.value)}
              autoFocus
            />
          </div>

          <div className="checkout-field" style={{ margin: 0 }}>
            <label className="checkout-label" style={{ fontSize: '.75rem' }}>
              URL slug *{' '}
              <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none' }}>(auto-filled — editable)</span>
            </label>
            <input
              className="checkout-input"
              placeholder="e.g. kurtis"
              value={newCatSlug}
              onChange={e => { setNewCatSlug(e.target.value); setSlugTouched(true); }}
            />
          </div>

          {catError && (
            <p style={{ color: '#dc2626', fontSize: '.78rem', margin: 0 }}>{catError}</p>
          )}

          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={creatingCat || !newCatLabel.trim() || !newCatSlug.trim()}
              style={{
                flex: 1, padding: '.55rem', background: '#7c3aed', color: 'white',
                border: 'none', borderRadius: '.45rem', fontSize: '.82rem',
                fontWeight: 700, cursor: 'pointer',
                opacity: creatingCat || !newCatLabel.trim() || !newCatSlug.trim() ? .5 : 1,
              }}
            >
              {creatingCat ? 'Creating…' : 'Create & select'}
            </button>
            <button
              type="button"
              onClick={cancelNewCat}
              style={{
                padding: '.55rem .75rem', background: 'white', color: '#6b7280',
                border: '1px solid #e5e7eb', borderRadius: '.45rem',
                fontSize: '.82rem', cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Accessories subcategory */}
      {isAccessories && (
        <div className="checkout-field">
          <label className="checkout-label">Subcategory</label>
          <input
            type="text"
            className="checkout-input"
            placeholder="e.g. jewellery, dupattas, footwear"
            value={form.subcategory ?? ''}
            onChange={e => set('subcategory', e.target.value)}
          />
          <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginTop: '.25rem' }}>
            Used to filter accessories on the shop page.
          </p>
        </div>
      )}

      {/* Badge */}
      <div className="checkout-field">
        <label className="checkout-label">Badge</label>
        <select
          className="checkout-input"
          value={form.badge ?? ''}
          onChange={e => set('badge', e.target.value)}
        >
          {BADGES.map(b => (
            <option key={b} value={b}>{b || '— None —'}</option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, padding: '.5rem .75rem', background: 'var(--color-surface-offset)', borderRadius: '.5rem' }}>
        🖼️ Images and stock are managed on the next screen.
      </p>
    </div>
  );
}
