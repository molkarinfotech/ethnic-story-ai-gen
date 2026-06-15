import { getProducts } from '../../../lib/fetchProducts';
import { notFound } from 'next/navigation';
import { FilteredCollection } from '../../../components/shop/FilteredCollection';

export const revalidate = 60;

// Audience-first slugs
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

// Legacy garment-based slugs (backwards compatible)
const CATEGORY_META: Record<string, { label: string; desc: string }> = {
  sarees:    { label: 'Sarees',     desc: 'Timeless drapes — handwoven silk, cotton, and georgette styles for every occasion.' },
  lehengas:  { label: 'Lehengas',  desc: 'From grand bridal sets to festive occasion wear, crafted in rich fabrics.' },
  kurtas:    { label: 'Kurtas',    desc: 'Everyday ethnic elegance — block prints, chikankari, and more.' },
  sherwanis: { label: 'Sherwanis', desc: 'Regal occasion wear for men — from grand wedding sherwanis to festive sets.' },
};

export function generateStaticParams() {
  const genderSlugs = Object.keys(GENDER_META).map(category => ({ category }));
  const catSlugs    = Object.keys(CATEGORY_META).map(category => ({ category }));
  return [...genderSlugs, ...catSlugs];
}

export default async function CollectionSlugPage({ params }: { params: { category: string } }) {
  const { category } = params;
  const allProducts  = await getProducts();

  // ── Audience page (women / men / kids) ──────────────────────────────────────
  const genderMeta = GENDER_META[category];
  if (genderMeta) {
    const products = allProducts.filter(
      p => p.gender === category || p.gender === 'unisex'
    );
    return (
      <main>
        <div className="page-header">
          <p className="page-header__eyebrow">Collections</p>
          <h1>{genderMeta.label}</h1>
          <p>{genderMeta.desc}</p>
        </div>

        {/* Subcategory chips */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '.75rem 0' }}>
          <div className="container" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={`/collections/${category}`}
              style={{ padding: '.35rem .85rem', borderRadius: '2rem', background: 'var(--color-primary)', color: 'white', fontSize: '.8rem', fontWeight: 700, textDecoration: 'none' }}>
              All
            </a>
            {genderMeta.subcategories.map(sub => {
              const count = products.filter(p => p.category === sub).length;
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

        <FilteredCollection products={products} category={genderMeta.label} />
      </main>
    );
  }

  // ── Legacy garment page (sarees / lehengas / kurtas / sherwanis) ─────────────
  const catMeta = CATEGORY_META[category];
  if (!catMeta) notFound();

  const products = allProducts.filter(p => p.category === category);

  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Collection</p>
        <h1>{catMeta.label}</h1>
        <p>{catMeta.desc}</p>
      </div>
      <FilteredCollection products={products} category={catMeta.label} />
    </main>
  );
}
