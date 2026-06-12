import { ProductCard } from '../../components/shop/ProductCard';
import { PRODUCTS } from '../../lib/products';

export default function CollectionsPage() {
  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Browse All</p>
        <h1>Our Collections</h1>
        <p>Handpicked ethnic wear from across India</p>
      </div>
      <section className="section">
        <div className="container">
          <div className="filter-bar">
            {[['All', '/collections'],['Sarees','/collections/sarees'],['Lehengas','/collections/lehengas'],['Kurtas','/collections/kurtas'],['Kids','/collections/kids']].map(([l,h]) => (
              <a key={l} href={h} className="filter-chip">{l}</a>
            ))}
          </div>
          <div className="grid-4">
            {PRODUCTS.map(p => <ProductCard key={p.id} {...p} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
