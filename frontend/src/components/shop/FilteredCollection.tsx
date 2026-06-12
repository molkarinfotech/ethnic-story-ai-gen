'use client';
import { useState } from 'react';
import { Product } from '../../lib/products';
import { ProductCard } from './ProductCard';

const SORT_OPTIONS = [
  { value: 'default',    label: 'Featured' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name',       label: 'Name A–Z' },
];

export function FilteredCollection({ products, category }: { products: Product[]; category: string }) {
  const [sort, setSort]     = useState('default');
  const [filter, setFilter] = useState<string | null>(null);

  const badges = Array.from(new Set(products.map(p => p.badge).filter(Boolean))) as string[];

  const sorted = [...products]
    .filter(p => !filter || p.badge === filter)
    .sort((a, b) => {
      if (sort === 'price-asc')  return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name')       return a.name.localeCompare(b.name);
      return 0;
    });

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

        {/* Results count */}
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
          Showing {sorted.length} {sorted.length === 1 ? 'style' : 'styles'}
        </p>

        {/* Grid */}
        {sorted.length > 0 ? (
          <div className="grid-4">
            {sorted.map(p => <ProductCard key={p.id} {...p} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)' }}>No styles match this filter.</p>
            <button className="btn btn--outline" style={{ marginTop: 'var(--space-4)' }} onClick={() => setFilter(null)}>Clear filter</button>
          </div>
        )}
      </div>
    </section>
  );
}
