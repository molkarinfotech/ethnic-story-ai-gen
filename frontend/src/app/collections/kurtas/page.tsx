import { ProductCard } from '../../../components/shop/ProductCard';
import { PRODUCTS } from '../../../lib/products';

const products = PRODUCTS.filter(p => p.category === 'kurtas');

export default function KurtasPage() {
  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Collection</p>
        <h1>👚 Kurtas & Co-ords</h1>
        <p>From hand-block prints to chikankari embroidery — ethnic comfort for every day</p>
      </div>
      <section className="section">
        <div className="container">
          <div className="breadcrumb"><a href="/">Home</a> › <a href="/collections">Collections</a> › Kurtas</div>
          <div className="filter-bar">
            {['All Kurtas','Anarkali','Block Print','Chikankari','Indo-Western','Co-ords'].map(f => (
              <span key={f} className={`filter-chip${f==='All Kurtas'?' filter-chip--active':''}`}>{f}</span>
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
