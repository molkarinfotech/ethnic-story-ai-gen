'use client';
import { useState, useEffect } from 'react';

type Category = { id: string; slug: string; label: string; description?: string; sort_order?: number };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(data => { setCategories(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>Categories</h1>

      {loading && <p style={{ color: '#6b7280', fontSize: '.875rem' }}>Loading…</p>}

      {!loading && categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🏷️</div>
          <p style={{ fontWeight: 600, color: '#6b7280' }}>No categories yet</p>
          <p style={{ fontSize: '.875rem', marginTop: '.25rem' }}>Categories are created automatically when you add products.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {categories.map(cat => (
          <div key={cat.id ?? cat.slug} style={{
            background: 'white', borderRadius: '.65rem', padding: '.9rem 1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid #fce7f3', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.9rem', color: '#111827', textTransform: 'capitalize' }}>{cat.label ?? cat.slug}</div>
              {cat.description && <div style={{ fontSize: '.775rem', color: '#6b7280', marginTop: '.1rem' }}>{cat.description}</div>}
            </div>
            <a
              href={`/collections/${cat.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '.775rem', color: '#9d174d', fontWeight: 600, textDecoration: 'none' }}
            >
              View →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
