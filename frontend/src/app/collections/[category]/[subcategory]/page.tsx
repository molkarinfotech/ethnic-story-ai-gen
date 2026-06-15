import { getProducts } from '../../../../lib/fetchProducts';
import { notFound } from 'next/navigation';
import { FilteredCollection } from '../../../../components/shop/FilteredCollection';

export const revalidate = 60;

const GENDER_META: Record<string, { label: string; subcategories: string[] }> = {
  women: { label: 'Women', subcategories: ['sarees', 'lehengas', 'kurtas'] },
  men:   { label: 'Men',   subcategories: ['kurtas', 'sherwanis'] },
  kids:  { label: 'Kids',  subcategories: ['lehengas', 'kurtas', 'sherwanis', 'sarees'] },
};

export function generateStaticParams() {
  return Object.entries(GENDER_META).flatMap(([category, { subcategories }]) =>
    subcategories.map(subcategory => ({ category, subcategory }))
  );
}

export default async function GenderSubcategoryPage({
  params,
}: {
  params: { category: string; subcategory: string };
}) {
  const genderMeta = GENDER_META[params.category];
  if (!genderMeta) notFound();
  if (!genderMeta.subcategories.includes(params.subcategory)) notFound();

  const allProducts = await getProducts();

  // Women page: also include NULL-gender products (legacy items without gender set)
  const products = params.category === 'women'
    ? allProducts.filter(p =>
        p.category === params.subcategory &&
        (p.gender === 'women' || p.gender === 'unisex' || !p.gender)
      )
    : allProducts.filter(p =>
        p.category === params.subcategory &&
        (p.gender === params.category || p.gender === 'unisex')
      );

  const label = params.subcategory.charAt(0).toUpperCase() + params.subcategory.slice(1);

  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">{genderMeta.label}</p>
        <h1>{label}</h1>
        <p>{genderMeta.label}&rsquo;s {label.toLowerCase()} — handcrafted in India.</p>
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '.75rem 0' }}>
        <div className="container" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={`/collections/${params.category}`}
            style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-surface-offset)', color: 'var(--color-text)', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none' }}>
            ← All {genderMeta.label}
          </a>
          {genderMeta.subcategories.map(sub => (
            <a key={sub} href={`/collections/${params.category}/${sub}`}
              style={{
                padding: '.35rem .85rem', borderRadius: '2rem', fontSize: '.8rem', fontWeight: 700,
                textDecoration: 'none', textTransform: 'capitalize',
                background: sub === params.subcategory ? 'var(--color-primary)' : 'var(--color-surface-offset)',
                color: sub === params.subcategory ? 'white' : 'var(--color-text)',
              }}>
              {sub}
            </a>
          ))}
        </div>
      </div>

      <FilteredCollection products={products} category={`${genderMeta.label} · ${label}`} />
    </main>
  );
}
