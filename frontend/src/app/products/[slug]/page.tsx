import { getProducts, getProductBySlug, Product } from '../../../lib/fetchProducts';
import { formatAUD } from '../../../lib/products';
import { notFound } from 'next/navigation';
import { AddToCartSection } from '../../../components/shop/AddToCartSection';
import { ProductImageCarousel } from '../../../components/shop/ProductImageCarousel';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const categoryLabel: Record<string, string> = {
  sarees: 'Sarees', lehengas: 'Lehengas', kurtas: 'Kurtas', kids: 'Kids Wear',
};

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  // Fetch extra images directly (not in Product type yet)
  const sb = getServiceSupabase();
  const { data: prodData } = await sb
    .from('products')
    .select('images')
    .eq('id', product.id)
    .single();

  const extraImages: string[] = Array.isArray(prodData?.images) ? prodData.images : [];
  const allImages: string[] = [product.image, ...extraImages].filter(Boolean) as string[];

  const allProducts = await getProducts();
  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const origPrice = product.original_price ?? product.originalPrice;
  const discount  = origPrice ? Math.round((1 - product.price / origPrice) * 100) : null;
  const description = (product as Product & { description?: string }).description;

  return (
    <main style={{ background: 'var(--color-bg)' }}>

      {/* Breadcrumb */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)', padding: '.75rem 0' }}>
        <div className="container">
          <nav style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <a href="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Home</a>
            <span style={{ color: 'var(--color-gold)' }}>/</span>
            <a href="/collections" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Collections</a>
            <span style={{ color: 'var(--color-gold)' }}>/</span>
            <a href={`/collections/${product.category}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>{categoryLabel[product.category]}</a>
            <span style={{ color: 'var(--color-gold)' }}>/</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main PDP */}
      <section style={{ padding: 'var(--space-16) 0 var(--space-20)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 'var(--space-16)', alignItems: 'start' }}>

            {/* LEFT — Image carousel */}
            <div style={{ position: 'sticky', top: '6rem' }}>
              <ProductImageCarousel
                images={allImages}
                name={product.name}
                badge={product.badge}
                discount={discount}
              />

              {/* Craft badge */}
              <div style={{ marginTop: 'var(--space-6)', background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-6)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>✍️</span>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Handcrafted in India</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '.2rem' }}>By skilled artisans using traditional techniques</div>
                </div>
              </div>
            </div>

            {/* RIGHT — Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'var(--color-primary-highlight)', color: 'var(--color-primary)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '.35rem .9rem', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-4)' }}>
                  {categoryLabel[product.category] ?? product.category}
                </span>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 1.2rem + 2vw, 2.75rem)', fontWeight: 700, lineHeight: 1.15, color: 'var(--color-text)', margin: 0 }}>{product.name}</h1>
                {product.subtitle && (
                  <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', lineHeight: 1.6 }}>{product.subtitle}</p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }} />
                <span style={{ color: 'var(--color-gold)', fontSize: '.75rem' }}>✷</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 1.4rem + 1vw, 2.25rem)', fontWeight: 700, color: 'var(--color-primary)' }}>{formatAUD(product.price)}</span>
                {origPrice && <s style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-faint)' }}>{formatAUD(origPrice)}</s>}
                {discount && <span style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.25rem .7rem', borderRadius: 'var(--radius-full)' }}>Save {discount}%</span>}
              </div>

              <AddToCartSection product={{ ...product, originalPrice: origPrice }} />

              {/* Trust row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
                {[['\ud83d\ude9a','Free Shipping','Orders over A$150'],['\u21a9\ufe0f','Easy Returns','15-day hassle-free'],['\u2705','100% Authentic','Direct from artisans'],['\ud83d\udd12','Secure Checkout','Stripe & Razorpay']].map(([icon,title,sub]) => (
                  <div key={title} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.1rem', marginTop: '.1rem' }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Accordions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[
                  { title: 'Product details', content: (
                    <>
                      <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: 'var(--space-4)' }}>{description ?? 'Handcrafted by skilled artisans using traditional techniques.'}</p>
                      <ul style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        <li>Care: Dry clean recommended</li>
                        <li>Origin: Made in India</li>
                        <li>SKU: {product.id.toUpperCase().slice(0, 8)}</li>
                      </ul>
                    </>
                  )},
                  { title: 'Shipping & returns', content: <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>Free standard shipping on orders over A$150. Express delivery available at checkout. Delivered Australia-wide within 5–9 business days. Returns accepted within 15 days of delivery in original, unworn condition.</p> },
                ].map(({ title, content }) => (
                  <details key={title} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <summary style={{ padding: 'var(--space-4) var(--space-5)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {title}<span style={{ color: 'var(--color-gold)', fontSize: '1.1rem' }}>+</span>
                    </summary>
                    <div style={{ padding: '0 var(--space-5) var(--space-5)', borderTop: '1px solid var(--color-divider)' }}>
                      <div style={{ paddingTop: 'var(--space-4)' }}>{content}</div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #8b2f54 100%)', padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-gold)', fontSize: '.8rem', letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700 }}>
          ✷   Rooted in Indian Craft   ✷   Designed for Modern Celebrations   ✷
        </div>
      </div>

      {related.length > 0 && (
        <section style={{ padding: 'var(--space-20) 0', background: 'var(--color-surface)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
              <span className="pill">You may also like</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 1rem + 1.5vw, 2.25rem)', marginTop: 'var(--space-4)', color: 'var(--color-text)' }}>More from {categoryLabel[product.category]}</h2>
            </div>
            <div className="grid-4">
              {related.map(p => (
                <a key={p.id} href={`/products/${p.slug}`} className="product-card" style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="product-card__image">
                    {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span style={{ fontSize: '4rem' }}>🥻</span>}
                    {p.badge && <span className="product-card__badge">{p.badge}</span>}
                  </div>
                  <div className="product-card__body">
                    <div className="product-card__name">{p.name}</div>
                    {p.subtitle && <div className="product-card__sub">{p.subtitle}</div>}
                    <div className="product-card__price" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{formatAUD(p.price)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
