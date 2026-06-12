export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  priceInr: number;
  originalPriceInr?: number;
  category: string;
  badge?: string;
  emoji?: string;
};

export function ProductCard({ id, slug, name, subtitle, priceInr, originalPriceInr, badge, emoji }: Product) {
  return (
    <a href={`/products/${slug}`} className="product-card">
      <div className="product-card__image">
        <span style={{ fontSize: '5rem' }}>{emoji || '👗'}</span>
        {badge && <span className="product-card__badge">{badge}</span>}
      </div>
      <div className="product-card__body">
        <div className="product-card__name">{name}</div>
        {subtitle && <div className="product-card__sub">{subtitle}</div>}
        <div className="product-card__price">
          ₹{priceInr.toLocaleString('en-IN')}
          {originalPriceInr && <s>₹{originalPriceInr.toLocaleString('en-IN')}</s>}
        </div>
      </div>
    </a>
  );
}
