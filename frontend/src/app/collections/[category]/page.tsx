import { getProducts } from '../../../lib/fetchProducts';
import { notFound } from 'next/navigation';
import { FilteredCollection } from '../../../components/shop/FilteredCollection';

export const revalidate = 60;

// Legacy garment-based collection pages — kept for backwards compatibility.
// New audience-first pages live at /collections/[gender] and /collections/[gender]/[subcategory].
const META: Record<string, { label: string; desc: string }> = {
  sarees:    { label: 'Sarees',    desc: 'Timeless drapes — handwoven silk, cotton, and georgette styles for every occasion.' },
  lehengas:  { label: 'Lehengas', desc: 'From grand bridal sets to festive occasion wear, crafted in rich fabrics.' },
  kurtas:    { label: 'Kurtas',   desc: 'Everyday ethnic elegance — block prints, chikankari, and more.' },
  kids:      { label: 'Kids Wear', desc: 'Festive and everyday ethnic looks for little ones aged 1–14.' },
  sherwanis: { label: 'Sherwanis', desc: 'Regal occasion wear for men — from grand wedding sherwanis to festive sets.' },
};

// These are the ONLY slugs this route handles. Audience slugs (women/men/kids as gender)
// resolve via the new [gender] route first — but Next.js route priority means this file
// only fires for slugs listed in generateStaticParams.
export function generateStaticParams() {
  return Object.keys(META).map(category => ({ category }));
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const meta = META[params.category];
  if (!meta) notFound();

  const allProducts = await getProducts();
  const products = allProducts.filter(p => p.category === params.category);

  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Collection</p>
        <h1>{meta.label}</h1>
        <p>{meta.desc}</p>
      </div>
      <FilteredCollection products={products} category={params.category} />
    </main>
  );
}
