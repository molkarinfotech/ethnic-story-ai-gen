export default function CartPage() {
  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Shopping</p>
        <h1>Your Cart</h1>
      </div>
      <div className="container section">
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--color-muted)', fontFamily: 'system-ui', marginBottom: '2rem' }}>Discover our beautiful ethnic collections and add something you love.</p>
          <a href="/collections" className="btn btn--primary">Browse Collections</a>
        </div>
      </div>
    </main>
  );
}
