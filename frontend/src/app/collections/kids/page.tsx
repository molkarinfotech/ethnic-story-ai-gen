import { ProductCard } from '../../../components/shop/ProductCard';
import { PRODUCTS } from '../../../lib/products';

const products = PRODUCTS.filter(p => p.category === 'kids');

export default function KidsPage() {
  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Collection</p>
        <h1>🎀 Kids Ethnic Wear</h1>
        <p>Festive and everyday ethnic outfits for girls and boys — comfortable, colourful, and adorable</p>
      </div>
      <section className="section">
        <div className="container">
          <div className="breadcrumb"><a href="/">Home</a> › <a href="/collections">Collections</a> › Kids</div>
          <div className="filter-bar">
            {['All Kids','Girls Lehenga','Boys Sherwani','Kurta Sets','Gowns'].map(f => (
              <span key={f} className={`filter-chip${f==='All Kids'?' filter-chip--active':''}`}>{f}</span>
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
