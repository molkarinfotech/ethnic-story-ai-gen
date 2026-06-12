import { getProducts } from '../../lib/fetchProducts';

export const revalidate = 60;

const CATEGORIES = [
  { slug: 'sarees',   label: 'Sarees',    desc: 'Timeless drapes for every occasion', bg: 'one',   emoji: '🥻' },
  { slug: 'lehengas', label: 'Lehengas',  desc: 'Bridal and festive splendour',        bg: 'two',   emoji: '👗' },
  { slug: 'kurtas',   label: 'Kurtas',    desc: 'Everyday ethnic elegance',             bg: 'three', emoji: '👚' },
  { slug: 'kids',     label: 'Kids Wear', desc: 'Ethnic joy for little ones',           bg: 'four',  emoji: '🎠' },
];

export default async function CollectionsPage() {
  const products = await getProducts();
  const total = products.length;

  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Browse All</p>
        <h1>Our Collections</h1>
        <p>{total} curated styles across sarees, lehengas, kurtas &amp; kids wear</p>
      </div>

      <section className="section">
        <div className="container">
          <div className="collections-grid">
            {CATEGORIES.slice(0, 3).map(c => (
              <a key={c.slug} href={`/collections/${c.slug}`} className="collection-card">
                <div className={`bg ${c.bg}`}></div>
                <div className="ornament"></div>
                <div className="collection-content">
                  <span>{products.filter(p => p.category === c.slug).length} styles</span>
                  <h3>{c.label}</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,248,243,.7)', marginTop: '.25rem' }}>{c.desc}</p>
                </div>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <a href={`/collections/${CATEGORIES[3].slug}`} className="collection-card" style={{ display: 'flex', maxHeight: '14rem' }}>
              <div className={`bg ${CATEGORIES[3].bg}`}></div>
              <div className="ornament"></div>
              <div className="collection-content">
                <span>{products.filter(p => p.category === CATEGORIES[3].slug).length} styles</span>
                <h3>{CATEGORIES[3].label}</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,248,243,.7)', marginTop: '.25rem' }}>{CATEGORIES[3].desc}</p>
              </div>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
