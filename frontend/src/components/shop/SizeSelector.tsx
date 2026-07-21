'use client';
import { useEffect, useState } from 'react';

const LETTER_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

export type Variant = { id: string; size: string; colour: string; stock_count: number };

function sortSizes(variants: Variant[]): Variant[] {
  const letter  = variants.filter(v => LETTER_SIZE_ORDER.includes(v.size))
    .sort((a, b) => LETTER_SIZE_ORDER.indexOf(a.size) - LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = variants.filter(v => /^\d/.test(v.size))
    .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const other   = variants.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter, ...numeric, ...other];
}

function uniqueColours(variants: Variant[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    if (v.colour && v.colour.trim() && !seen.has(v.colour)) {
      seen.add(v.colour);
      out.push(v.colour);
    }
  }
  return out;
}

export function SizeSelector({
  productId,
  onSizeChange,
  onColourChange,
}: {
  productId: string;
  onSizeChange?: (size: string | null, inStock: boolean, stockCount: number, colour: string, variantId?: string) => void;
  onColourChange?: (colour: string) => void;
}) {
  const [variants, setVariants]     = useState<Variant[]>([]);
  const [selectedColour, setColour] = useState<string>('');
  const [selected, setSelected]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch(`/api/variants/${productId}?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const norm: Variant[] = data.map((v: Variant) => ({
            ...v,
            colour: (v.colour ?? '').trim(),
            stock_count: Number(v.stock_count),
          }));
          const sorted = sortSizes(norm);
          setVariants(sorted);
          const firstColour = sorted.find(v => v.colour !== '')?.colour ?? '';
          setColour(firstColour);
          if (firstColour) onColourChange?.(firstColour);
        } else {
          setVariants([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const colours = uniqueColours(variants);
  const hasColours = colours.length > 0;
  const filteredVariants = hasColours
    ? variants.filter(v => v.colour === selectedColour)
    : variants;

  function selectColour(c: string) {
    setColour(c);
    setSelected(null);
    onColourChange?.(c);
    onSizeChange?.(null, false, 0, c, undefined);
  }

  function selectSize(v: Variant) {
    const inStock = v.stock_count > 0;
    setSelected(v.size);
    onSizeChange?.(v.size, inStock, v.stock_count, v.colour, v.id);
  }

  if (!loading && variants.length === 0) return null;

  if (loading) return (
    <div style={{ height: '48px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />
  );

  const selectedVariant = filteredVariants.find(v => v.size === selected);

  return (
    <div>
      {/* Colour swatches */}
      {hasColours && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 'var(--space-2)' }}>
            Colour{selectedColour ? <span style={{ color: 'var(--color-text)', fontWeight: 700 }}> — {selectedColour}</span> : null}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {colours.map(c => {
              const isSelected = c === selectedColour;
              const colourVariants = variants.filter(v => v.colour === c);
              const allOOS = colourVariants.every(v => v.stock_count === 0);
              return (
                <button
                  key={c}
                  onClick={() => selectColour(c)}
                  title={allOOS ? `${c} — Out of stock` : c}
                  style={{
                    padding: '.4rem 1rem',
                    borderRadius: 'var(--radius-full)',
                    border: isSelected
                      ? allOOS ? '2px solid #fca5a5' : '2px solid var(--color-primary)'
                      : allOOS ? '1px dashed var(--color-border)' : '1.5px solid var(--color-border)',
                    background: isSelected
                      ? allOOS ? '#fef2f2' : 'var(--color-primary-highlight)'
                      : allOOS ? 'var(--color-surface-offset)' : 'white',
                    color: isSelected
                      ? allOOS ? '#b91c1c' : 'var(--color-primary)'
                      : allOOS ? 'var(--color-text-faint)' : 'var(--color-text)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'all .15s',
                  }}
                >
                  {c}{allOOS ? ' — OOS' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size pills */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Size{selected ? <span style={{ color: 'var(--color-text)', fontWeight: 700 }}> — {selected}</span> : null}
        </label>
        <a href="#" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>Size guide</a>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {filteredVariants.map(v => {
          const outOfStock = v.stock_count === 0;
          const lowStock   = v.stock_count > 0 && v.stock_count <= 5;
          const isSelected = selected === v.size;
          return (
            <button
              key={`${v.colour}-${v.size}`}
              onClick={() => selectSize(v)}
              title={outOfStock ? 'Out of stock — click to register for restock notification' : lowStock ? `Only ${v.stock_count} left` : ''}
              style={{
                minWidth: '52px', padding: '.5rem .9rem',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? outOfStock ? '2px solid #fca5a5' : '2px solid var(--color-primary)'
                  : outOfStock ? '1px dashed var(--color-border)' : '1px solid var(--color-border)',
                background: isSelected
                  ? outOfStock ? '#fef2f2' : 'var(--color-primary-highlight)'
                  : outOfStock ? 'var(--color-surface-offset)' : 'white',
                color: isSelected
                  ? outOfStock ? '#b91c1c' : 'var(--color-primary)'
                  : outOfStock ? 'var(--color-text-faint)' : 'var(--color-text)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                position: 'relative',
                opacity: outOfStock ? 0.7 : 1,
                transition: 'all .15s',
              }}
            >
              {v.size}
              {lowStock && !outOfStock && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#f59e0b', color: 'white', borderRadius: '2rem', fontSize: '0.6rem', padding: '1px 4px', fontWeight: 700, lineHeight: 1.4 }}>{v.stock_count}</span>
              )}
              {outOfStock && (
                <span style={{ position: 'absolute', top: '-7px', right: '-7px', background: '#dc2626', color: 'white', borderRadius: '2rem', fontSize: '0.55rem', padding: '1px 4px', fontWeight: 700, lineHeight: 1.4, whiteSpace: 'nowrap' }}>OOS</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedVariant && (
        <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: selectedVariant.stock_count === 0 ? '#b91c1c' : selectedVariant.stock_count <= 5 ? '#ca8a04' : 'var(--color-text-muted)' }}>
          {selectedVariant.stock_count === 0
            ? '❌ Out of stock — register below to be notified when it's back'
            : selectedVariant.stock_count <= 5 ? `⚠️ Only ${selectedVariant.stock_count} left in this size`
            : '✅ In stock'}
        </p>
      )}
    </div>
  );
}
