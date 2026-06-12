import { ProductCard } from '../../../components/shop/ProductCard';
import { PRODUCTS } from '../../../lib/products';

const products = PRODUCTS.filter(p => p.category === 'sarees');

export default function SareesPage() {
  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Collection</p>
        <h1>🥻 Sarees</h1>
        <p>Timeless drapes from the finest weavers in India — Banarasi, Kanjivaram, Chanderi and more</p>
      </div>
      <section className="section">
        <div className="container">
          <div className="breadcrumb"><a href="/">Home</a> › <a href="/collections">Collections</a> › Sarees</div>
          <div className="filter-bar">
            {['All Sarees','Silk','Cotton','Georgette','Printed','Embroidered'].map(f => (
              <span key={f} className={`filter-chip${f==='All Sarees'?' filter-chip--active':''}`}>{f}</span>
            ))}
          </div>
          <div className="grid-4">
            {products.map(p => <ProductCard key={p.id} {...p} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
