'use client';
import { useEffect, useState } from 'react';

const LETTER_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

type Variant = { id: string; size: string; stock_count: number };

function sortSizes(variants: Variant[]): Variant[] {
  const letter = variants.filter(v => LETTER_SIZE_ORDER.includes(v.size))
    .sort((a, b) => LETTER_SIZE_ORDER.indexOf(a.size) - LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = variants.filter(v => /^\d/.test(v.size))
    .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const other = variants.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

export function SizeSelector({
  productId,
  onSizeChange,
}: {
  productId: string;
  onSizeChange?: (size: string | null, inStock: boolean) => void;
}) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/variants/${productId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const normalised = data.map((v: Variant) => ({ ...v, stock_count: Number(v.stock_count) }));
          setVariants(sortSizes(normalised));
        } else {
          setVariants([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  function select(v: Variant) {
    if (v.stock_count === 0) return;
    setSelected(v.size);
    onSizeChange?.(v.size, true);
  }

  if (!loading && variants.length === 0) return null;

  if (loading) return (
    <div style={{ height: '48px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />
  );

  const selectedVariant = variants.find(v => v.size === selected);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Size {selected && <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>— {selected}</span>}
        </label>
        <a href="#" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>Size guide</a>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {variants.map(v => {
          const outOfStock = v.stock_count === 0;
          const lowStock = v.stock_count > 0 && v.stock_count <= 5;
          const isSelected = selected === v.size;
          return (
            <button
              key={v.size}
              onClick={() => select(v)}
              disabled={outOfStock}
              title={outOfStock ? 'Out of stock' : lowStock ? `Only ${v.stock_count} left` : ''}
              style={{
                minWidth: '52px',
                padding: '.5rem .9rem',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? '2px solid var(--color-primary)'
                  : outOfStock
                  ? '1px dashed var(--color-border)'
                  : '1px solid var(--color-border)',
                background: isSelected
                  ? 'var(--color-primary-highlight)'
                  : outOfStock
                  ? 'var(--color-surface-offset)'
                  : 'white',
                color: isSelected
                  ? 'var(--color-primary)'
                  : outOfStock
                  ? 'var(--color-text-faint)'
                  : 'var(--color-text)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 'var(--text-sm)',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
                position: 'relative',
                textDecoration: outOfStock ? 'line-through' : 'none',
                transition: 'all .15s',
              }}
            >
              {v.size}
              {lowStock && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#f59e0b', color: 'white',
                  borderRadius: '2rem', fontSize: '0.6rem',
                  padding: '1px 4px', fontWeight: 700, lineHeight: 1.4,
                }}>{v.stock_count}</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedVariant && (
        <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: selectedVariant.stock_count <= 5 ? '#ca8a04' : 'var(--color-text-muted)' }}>
          {selectedVariant.stock_count === 0
            ? '❌ Out of stock'
            : selectedVariant.stock_count <= 5
            ? `⚠️ Only ${selectedVariant.stock_count} left in this size`
            : '✅ In stock'}
        </p>
      )}
    </div>
  );
}
