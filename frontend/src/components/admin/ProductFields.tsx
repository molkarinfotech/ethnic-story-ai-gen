'use client';

const CATEGORIES = ['sarees', 'lehengas', 'kurtas', 'kids'];
const BADGES = ['', 'Bestseller', 'New', 'Sale', 'Premium', 'Test'];

export function ProductFields({
  form,
  set,
}: {
  form: Record<string, string>;
  set: (field: string, value: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[
        { id: 'name',           label: 'Product name *',        placeholder: 'Banarasi Silk Saree',            required: true },
        { id: 'slug',           label: 'URL slug *',             placeholder: 'banarasi-silk-saree',            required: true },
        { id: 'subtitle',       label: 'Subtitle',               placeholder: 'Pure silk with gold zari border' },
        { id: 'price',          label: 'Price (AUD) *',          placeholder: '189', type: 'number',            required: true },
        { id: 'original_price', label: 'Original price (AUD)',   placeholder: '229', type: 'number' },
      ].map(f => (
        <div key={f.id} className="checkout-field">
          <label className="checkout-label">{f.label}</label>
          <input
            type={f.type ?? 'text'}
            className="checkout-input"
            placeholder={f.placeholder}
            value={form[f.id] ?? ''}
            onChange={e => set(f.id, e.target.value)}
            required={f.required}
            step={f.type === 'number' ? '0.01' : undefined}
          />
        </div>
      ))}

      <div className="checkout-field">
        <label className="checkout-label">Category *</label>
        <select
          className="checkout-input"
          value={form.category}
          onChange={e => set('category', e.target.value)}
          required
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="checkout-field">
        <label className="checkout-label">Badge</label>
        <select
          className="checkout-input"
          value={form.badge}
          onChange={e => set('badge', e.target.value)}
        >
          {BADGES.map(b => (
            <option key={b} value={b}>{b || '— None —'}</option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, padding: '.5rem .75rem', background: 'var(--color-surface-offset)', borderRadius: '.5rem' }}>
        🖼️ To manage product images, go to the <strong>Images</strong> tab in the Admin Dashboard.
      </p>
    </div>
  );
}
