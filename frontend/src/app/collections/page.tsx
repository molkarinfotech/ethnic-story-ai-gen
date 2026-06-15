import { getProducts } from '../../lib/fetchProducts';

export const revalidate = 60;

const AUDIENCES = [
  {
    slug: 'women',
    label: 'Women',
    desc: 'Sarees, lehengas, kurtas & more',
    emoji: '🥻',
    subcategories: ['sarees', 'lehengas', 'kurtas'],
  },
  {
    slug: 'men',
    label: 'Men',
    desc: 'Kurtas, sherwanis & festive sets',
    emoji: '🧣',
    subcategories: ['kurtas', 'sherwanis'],
  },
  {
    slug: 'kids',
    label: 'Kids',
    desc: 'Ethnic joy for little ones',
    emoji: '🎠',
    subcategories: ['lehengas', 'kurtas', 'sherwanis'],
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
            {AUDIENCES.map(a => {
              // Women: also count NULL-gender products (legacy items default to women)
              const count = a.slug === 'women'
                ? products.filter(p => p.gender === 'women' || p.gender === 'unisex' || !p.gender).length
                : products.filter(p => p.gender === a.slug || p.gender === 'unisex').length;
              return (
                <a key={a.slug} href={`/collections/${a.slug}`} className="collection-card">
                  <div className="ornament"></div>
                  <div className="collection-content">
                    <span>{count} styles</span>
                    <h3>{a.emoji} {a.label}</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,248,243,.7)', marginTop: '.25rem' }}>{a.desc}</p>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.6rem' }}>
                      {a.subcategories.map(s => (
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
