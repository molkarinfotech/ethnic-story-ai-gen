'use client';
import { Product, formatAUD } from '../../lib/products';
import { useCart } from '../../context/CartContext';
import { useState } from 'react';

export function ProductCard({ id, slug, name, subtitle, price, originalPrice, badge, image, category }: Product) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem({ id, slug, name, subtitle, price, originalPrice, badge, image, category });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <a href={`/products/${slug}`} className="product-card">
      <div className="product-card__image">
        {image
          ? <img src={image} alt={name} loading="lazy" />
          : <span style={{ fontSize: '4rem' }}>🥻</span>
        }
        {badge && <span className="product-card__badge">{badge}</span>}
      </div>
      <div className="product-card__body">
        <div className="product-card__name">{name}</div>
        {subtitle && <div className="product-card__sub">{subtitle}</div>}
        <div className="product-card__price">
          {formatAUD(price)}
          {originalPrice && <s>{formatAUD(originalPrice)}</s>}
        </div>
        <button
          className={`add-to-cart-btn${added ? ' add-to-cart-btn--added' : ''}`}
          onClick={handleAdd}
          aria-label={`Add ${name} to cart`}
        >
          {added ? '✓ Added' : 'Add to Bag'}
        </button>
      </div>
    </a>
  );
}
