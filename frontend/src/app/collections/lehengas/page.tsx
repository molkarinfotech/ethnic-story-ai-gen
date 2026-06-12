import { ProductCard } from '../../../components/shop/ProductCard';
import { PRODUCTS } from '../../../lib/products';

const products = PRODUCTS.filter(p => p.category === 'lehengas');

export default function LehengasPage() {
  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Collection</p>
        <h1>👘 Lehengas</h1>
        <p>Bridal, festive and party lehengas crafted with the finest fabrics and embroidery</p>
      </div>
      <section className="section">
        <div className="container">
          <div className="breadcrumb"><a href="/">Home</a> › <a href="/collections">Collections</a> › Lehengas</div>
          <div className="filter-bar">
            {['All Lehengas','Bridal','Festive','Mirror Work','Velvet','Georgette'].map(f => (
              <span key={f} className={`filter-chip${f==='All Lehengas'?' filter-chip--active':''}`}>{f}</span>
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
