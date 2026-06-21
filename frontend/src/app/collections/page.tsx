import { getProducts } from '../../lib/fetchProducts';

export const revalidate = 60;

const CATEGORIES = [
  {
    slug: 'women',
    label: 'Women',
    desc: 'Sarees, lehengas, kurtas & more',
    emoji: '🥻',
    subcategories: ['sarees', 'lehengas', 'kurtas'],
    bgClass: 'one',
    type: 'gender' as const,
  },
  {
    slug: 'men',
    label: 'Men',
    desc: 'Kurtas, sherwanis & festive sets',
    emoji: '🧣',
    subcategories: ['kurtas', 'sherwanis'],
    bgClass: 'two',
    type: 'gender' as const,
  },
  {
    slug: 'kids',
    label: 'Kids',
    desc: 'Ethnic joy for little ones',
    emoji: '🎠',
    subcategories: ['lehengas', 'kurtas', 'sherwanis'],
    bgClass: 'three',
    type: 'gender' as const,
  },
  {
    slug: 'accessories',
    label: 'Accessories',
    desc: 'Jewellery, dupattas, footwear & more',
    emoji: '💎',
    subcategories: ['jewellery', 'dupattas', 'footwear'],
    bgClass: 'four',
    type: 'category' as const,
  },
];

export default async function CollectionsPage() {
  const products = await getProducts();

  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Browse All</p>
        <h1>Our Collections</h1>
        <p>{products.length} curated styles — handcrafted in India, delivered across Australia</p>
      </div>

      <section className="section">
        <div className="container">
          <div className="collections-grid">
            {CATEGORIES.map(cat => {
              let count: number;
              if (cat.type === 'category') {
                // Accessories: filter by category field
                count = products.filter(
                  p => p.category?.toLowerCase() === cat.slug
                ).length;
              } else if (cat.slug === 'women') {
                // Women: also count NULL-gender products (legacy items default to women)
                count = products.filter(
                  p => p.gender === 'women' || p.gender === 'unisex' || !p.gender
                ).length;
              } else {
                count = products.filter(
                  p => p.gender === cat.slug || p.gender === 'unisex'
                ).length;
              }

              return (
                <a key={cat.slug} href={`/collections/${cat.slug}`} className="collection-card">
                  {/* Coloured background layer — matches .bg.one/.two/.three/.four in globals.css */}
                  <div className={`bg ${cat.bgClass}`}></div>
                  <div className="ornament"></div>
                  <div className="collection-content">
                    <span>{count} styles</span>
                    <h3>{cat.emoji} {cat.label}</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,248,243,.7)', marginTop: '.25rem' }}>{cat.desc}</p>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.6rem' }}>
                      {cat.subcategories.map(s => (
                        <span key={s} style={{ background: 'rgba(255,255,255,.18)', borderRadius: '2rem', padding: '.1rem .55rem', fontSize: '.65rem', fontWeight: 600, textTransform: 'capitalize', color: 'rgba(255,248,243,.9)' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
