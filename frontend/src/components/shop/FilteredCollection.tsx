'use client';
import { useState, useRef } from 'react';
import { Product } from '../../lib/products';
import { ProductCard } from './ProductCard';

const SORT_OPTIONS = [
  { value: 'default',    label: 'Featured' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name',       label: 'Name A–Z' },
];

export function FilteredCollection({ products, category }: { products: Product[]; category: string }) {
  const [sort, setSort]       = useState('default');
  const [filter, setFilter]   = useState<string | null>(null);
  const [carousel, setCarousel] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const badges = Array.from(new Set(products.map(p => p.badge).filter(Boolean))) as string[];

  const sorted = [...products]
    .filter(p => !filter || p.badge === filter)
    .sort((a, b) => {
      if (sort === 'price-asc')  return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name')       return a.name.localeCompare(b.name);
      return 0;
    });

  function scroll(dir: 'left' | 'right') {
    if (!trackRef.current) return;
    const card = trackRef.current.querySelector('.product-card') as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 280;
    trackRef.current.scrollBy({ left: dir === 'right' ? step : -step, behavior: 'smooth' });
  }

  return (
    <section className="section">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href="/">Home</a><span>/</span>
          <a href="/collections">Collections</a><span>/</span>
          <span style={{ color: 'var(--color-text)', textTransform: 'capitalize' }}>{category}</span>
        </nav>

        {/* Toolbar */}
        <div className="collection-toolbar">
          <div className="filter-bar" style={{ margin: 0 }}>
            <button
              className={`filter-chip${!filter ? ' filter-chip--active' : ''}`}
              onClick={() => setFilter(null)}
            >All ({products.length})</button>
            {badges.map(b => (
              <button
                key={b}
                className={`filter-chip${filter === b ? ' filter-chip--active' : ''}`}
                onClick={() => setFilter(filter === b ? null : b)}
              >{b}</button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Grid / Carousel toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '.5rem', overflow: 'hidden' }}>
              <button
                title="Grid view"
                onClick={() => setCarousel(false)}
                style={{ padding: '.35rem .6rem', background: !carousel ? 'var(--color-primary)' : 'white', color: !carousel ? 'white' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
              >⊞</button>
              <button
                title="Carousel view"
                onClick={() => setCarousel(true)}
                style={{ padding: '.35rem .6rem', background: carousel ? 'var(--color-primary)' : 'white', color: carousel ? 'white' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
              >▶</button>
            </div>

            <div className="collection-sort">
              <label htmlFor="sort" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Sort by</label>
              <select
                id="sort" className="sort-select"
                value={sort} onChange={e => setSort(e.target.value)}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
          Showing {sorted.length} {sorted.length === 1 ? 'style' : 'styles'}
        </p>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)' }}>No styles match this filter.</p>
            <button className="btn btn--outline" style={{ marginTop: 'var(--space-4)' }} onClick={() => setFilter(null)}>Clear filter</button>
          </div>
        ) : carousel ? (
          /* ── Carousel ── */
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              style={{
                position: 'absolute', left: '-1.25rem', top: '50%', transform: 'translateY(-50%)',
                zIndex: 2, width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                background: 'white', border: '1px solid var(--color-border)',
                boxShadow: '0 2px 8px rgba(0,0,0,.12)', cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>

            <div
              ref={trackRef}
              style={{
                display: 'flex',
                gap: '1rem',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '.5rem',
                scrollbarWidth: 'none',
              }}
            >
              {sorted.map(p => (
                <div key={p.id} style={{ flex: '0 0 260px', scrollSnapAlign: 'start' }}>
                  <ProductCard {...p} />
                </div>
              ))}
            </div>

            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              style={{
                position: 'absolute', right: '-1.25rem', top: '50%', transform: 'translateY(-50%)',
                zIndex: 2, width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                background: 'white', border: '1px solid var(--color-border)',
                boxShadow: '0 2px 8px rgba(0,0,0,.12)', cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >›</button>
          </div>
        ) : (
          /* ── Grid ── */
          <div className="grid-4">
            {sorted.map(p => <ProductCard key={p.id} {...p} />)}
          </div>
        )}
      </div>
    </section>
  );
}
