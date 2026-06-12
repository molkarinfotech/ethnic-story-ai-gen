export type ProductCardProps = {
  name: string;
  price: number;
  image?: string;
  slug: string;
};

export function ProductCard({ name, price, image, slug }: ProductCardProps) {
  return (
    <a href={`/products/${slug}`} style={{ display: 'block', background: 'var(--color-surface)', borderRadius: '8px', overflow: 'hidden', textDecoration: 'none' }}>
      <div style={{ height: '200px', background: '#e8ddd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        {image ? <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷 Product Image'}
      </div>
      <div style={{ padding: '1rem' }}>
        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem' }}>{name}</h3>
        <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600 }}>₹{price.toLocaleString('en-IN')}</p>
      </div>
    </a>
  );
}
