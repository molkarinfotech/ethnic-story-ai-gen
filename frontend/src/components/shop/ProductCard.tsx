'use client';
import { Product } from '../../lib/products';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1583395235451-3e8c9d59641a?q=80&w=600&auto=format&fit=crop';

export function ProductCard({ slug, name, subtitle, priceInr, originalPriceInr, badge, image }: Product) {
  const imgSrc = image || FALLBACK_IMAGE;

  return (
    <a href={`/products/${slug}`} className="product-card">
      <div className="product-card__image">
        <img
          src={imgSrc}
          alt={name}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
        />
        {badge && <span className="product-card__badge">{badge}</span>}
      </div>
      <div className="product-card__body">
        <div className="product-card__name">{name}</div>
        {subtitle && <div className="product-card__sub">{subtitle}</div>}
        <div className="product-card__price">
          ₹{priceInr.toLocaleString('en-IN')}
          {originalPriceInr && (
            <s style={{ marginLeft: '0.5rem' }}>₹{originalPriceInr.toLocaleString('en-IN')}</s>
          )}
        </div>
      </div>
    </a>
  );
}
