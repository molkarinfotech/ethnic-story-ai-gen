import { PRODUCTS } from '../../../lib/products';
import { notFound } from 'next/navigation';
import { FilteredCollection } from '../../../components/shop/FilteredCollection';

const META: Record<string, { label: string; desc: string }> = {
  sarees:   { label: 'Sarees',    desc: 'Timeless drapes — handwoven silk, cotton, and georgette styles for every occasion.' },
  lehengas: { label: 'Lehengas', desc: 'From grand bridal sets to festive occasion wear, crafted in rich fabrics.' },
  kurtas:   { label: 'Kurtas',   desc: 'Everyday ethnic elegance — block prints, chikankari, and more.' },
  kids:     { label: 'Kids Wear', desc: 'Festive and everyday ethnic looks for little ones aged 1–14.' },
};

export function generateStaticParams() {
  return Object.keys(META).map(category => ({ category }));
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const meta = META[params.category];
  if (!meta) notFound();
  const products = PRODUCTS.filter(p => p.category === params.category);
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
