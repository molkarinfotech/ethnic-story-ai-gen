import { getProducts } from '../../../lib/fetchProducts';
import { notFound } from 'next/navigation';
import { FilteredCollection } from '../../../components/shop/FilteredCollection';

export const revalidate = 60;

const GENDER_META: Record<string, { label: string; desc: string; subcategories: string[] }> = {
  women: {
    label: 'Women',
    desc: 'Sarees, lehengas, kurtas and more — handcrafted for every occasion.',
    subcategories: ['sarees', 'lehengas', 'kurtas'],
  },
  men: {
    label: 'Men',
    desc: 'Kurtas, sherwanis and festive sets for the modern Indian man.',
    subcategories: ['kurtas', 'sherwanis'],
  },
  kids: {
    label: 'Kids',
    desc: 'Festive and everyday ethnic looks for little ones aged 1–14.',
    subcategories: ['lehengas', 'kurtas', 'sherwanis', 'sarees'],
  },
};

// Legacy garment-category slugs — these are handled by the old [category] route.
// We do NOT want them resolved here so old URLs keep working.
const LEGACY_CATEGORIES = new Set(['sarees', 'lehengas', 'kurtas', 'kids', 'sherwanis']);

export function generateStaticParams() {
  return Object.keys(GENDER_META).map(gender => ({ gender }));
}

export default async function GenderPage({ params }: { params: { gender: string } }) {
  // If it's a legacy garment slug, this page doesn't apply — let [category] handle it.
  if (LEGACY_CATEGORIES.has(params.gender)) notFound();

  const meta = GENDER_META[params.gender];
  if (!meta) notFound();

  const allProducts = await getProducts();
  const products = allProducts.filter(
    p => p.gender === params.gender || p.gender === 'unisex'
  );

  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Collections</p>
        <h1>{meta.label}</h1>
        <p>{meta.desc}</p>
      </div>

      {/* Subcategory chips */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '.75rem 0' }}>
        <div className="container" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={`/collections/${params.gender}`}
            style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-primary)', color: 'white', fontSize: '.8rem', fontWeight: 700, textDecoration: 'none' }}>
            All
          </a>
          {meta.subcategories.map(sub => {
            const count = products.filter(p => p.category === sub).length;
            if (count === 0) return null;
            return (
              <a key={sub} href={`/collections/${params.gender}/${sub}`}
                style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-surface-offset)', color: 'var(--color-text)', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none', textTransform: 'capitalize' }}>
                {sub} ({count})
              </a>
            );
          })}
        </div>
      </div>

      <FilteredCollection products={products} category={params.gender} />
    </main>
  );
}
