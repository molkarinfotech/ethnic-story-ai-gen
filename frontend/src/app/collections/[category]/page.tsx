import { getProducts } from '../../../lib/fetchProducts';
import { notFound } from 'next/navigation';
import { FilteredCollection } from '../../../components/shop/FilteredCollection';
import { Product } from '../../../lib/products';

export const revalidate = 60;

const GENDER_META: Record<string, { label: string; desc: string; subcategories: string[] }> = {
  women: {
    label: 'Women',
    desc: 'Sarees, lehengas, kurtas and more \u2014 handcrafted for every occasion.',
    subcategories: ['sarees', 'lehengas', 'kurtas'],
  },
  men: {
    label: 'Men',
    desc: 'Kurtas, sherwanis and festive sets for the modern Indian man.',
    subcategories: ['kurtas', 'sherwanis'],
  },
  kids: {
    label: 'Kids',
    desc: 'Festive and everyday ethnic looks for little ones aged 1\u201314.',
    subcategories: ['lehengas', 'kurtas', 'sherwanis', 'sarees'],
  },
};

const CATEGORY_META: Record<string, { label: string; desc: string }> = {
  sarees:      { label: 'Sarees',      desc: 'Timeless drapes \u2014 handwoven silk, cotton, and georgette styles for every occasion.' },
  lehengas:    { label: 'Lehengas',    desc: 'From grand bridal sets to festive occasion wear, crafted in rich fabrics.' },
  kurtas:      { label: 'Kurtas',      desc: 'Everyday ethnic elegance \u2014 block prints, chikankari, and more.' },
  sherwanis:   { label: 'Sherwanis',   desc: 'Regal occasion wear for men \u2014 from grand wedding sherwanis to festive sets.' },
  accessories: { label: 'Accessories', desc: 'Jewellery, dupattas, footwear and finishing touches to complete every ethnic look.' },
};

export function generateStaticParams() {
  return [
    ...Object.keys(GENDER_META).map(category => ({ category })),
    ...Object.keys(CATEGORY_META).map(category => ({ category })),
  ];
}

function titleCase(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uniqueSubcats(products: Product[]): string[] {
  const seen: Record<string, true> = {};
  const out: string[] = [];
  for (const p of products) {
    const s = (p as any).subcategory as string | undefined;
    if (s && !seen[s]) { seen[s] = true; out.push(s); }
  }
  return out;
}

const breadcrumbBar: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-divider)',
  padding: '.65rem 0',
};
const breadcrumbNav: React.CSSProperties = {
  display: 'flex', gap: '.5rem', alignItems: 'center',
  fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexWrap: 'wrap',
};
const bcLink: React.CSSProperties = {
  color: 'var(--color-text-muted)', textDecoration: 'none',
};
const bcSep: React.CSSProperties = { color: 'var(--color-gold)' };

export default async function CollectionSlugPage({ params }: { params: { category: string } }) {
  const { category } = params;
  const allProducts  = await getProducts();

  // -- Audience page (women / men / kids) --
  const genderMeta = GENDER_META[category];
  if (genderMeta) {
    const filtered = allProducts.filter(
      p => p.gender === category || p.gender === 'unisex'
    );

    return (
      <main>
        {/* Breadcrumb */}
        <div style={breadcrumbBar}>
          <div className="container">
            <nav style={breadcrumbNav}>
              <a href="/" style={bcLink}>Home</a>
              <span style={bcSep}>/</span>
              <a href="/collections" style={bcLink}>Collections</a>
              <span style={bcSep}>/</span>
              <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{genderMeta.label}</span>
            </nav>
          </div>
        </div>

        <div className="page-header">
          <p className="page-header__eyebrow">Collections</p>
          <h1>{genderMeta.label}</h1>
          <p>{genderMeta.desc}</p>
        </div>

        <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '.75rem 0' }}>
          <div className="container" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={`/collections/${category}`}
              style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-primary)', color: 'white', fontSize: '.8rem', fontWeight: 700, textDecoration: 'none' }}>
              All
            </a>
            {genderMeta.subcategories.map(sub => {
              const count = filtered.filter(p => p.category === sub).length;
              if (count === 0) return null;
              return (
                <a key={sub} href={`/collections/${category}/${sub}`}
                  style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-surface-offset)', color: 'var(--color-text)', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none', textTransform: 'capitalize' }}>
                  {sub} ({count})
                </a>
              );
            })}
          </div>
        </div>

        <FilteredCollection products={filtered} category={genderMeta.label} />
      </main>
    );
  }

  // -- Category page (sarees / lehengas / kurtas / sherwanis / accessories) --
  const catMeta = CATEGORY_META[category] ?? { label: titleCase(category), desc: '' };
  const products = allProducts.filter(p => p.category === category);

  // If still totally unknown and no products, 404
  if (!CATEGORY_META[category] && products.length === 0) notFound();

  const isAccessories = category === 'accessories';
  const accessorySubcats = isAccessories ? uniqueSubcats(products) : [];

  return (
    <main>
      {/* Breadcrumb */}
      <div style={breadcrumbBar}>
        <div className="container">
          <nav style={breadcrumbNav}>
            <a href="/" style={bcLink}>Home</a>
            <span style={bcSep}>/</span>
            <a href="/collections" style={bcLink}>Collections</a>
            <span style={bcSep}>/</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{catMeta.label}</span>
          </nav>
        </div>
      </div>

      <div className="page-header">
        <p className="page-header__eyebrow">Collection</p>
        <h1>{catMeta.label}</h1>
        {catMeta.desc && <p>{catMeta.desc}</p>}
      </div>

      {isAccessories && accessorySubcats.length > 0 && (
        <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '.75rem 0' }}>
          <div className="container" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="/collections/accessories"
              style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-primary)', color: 'white', fontSize: '.8rem', fontWeight: 700, textDecoration: 'none' }}>
              All
            </a>
            {accessorySubcats.map(sub => (
              <a key={sub} href={`/collections/accessories/${sub}`}
                style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-surface-offset)', color: 'var(--color-text)', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none', textTransform: 'capitalize' }}>
                {sub} ({products.filter(p => (p as any).subcategory === sub).length})
              </a>
            ))}
          </div>
        </div>
      )}

      <FilteredCollection products={products} category={catMeta.label} />
    </main>
  );
}
