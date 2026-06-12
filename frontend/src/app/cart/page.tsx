export default function CartPage() {
  return (
    <main>
      <h1>Your Cart</h1>
      <p style={{ opacity: 0.6 }}>Your cart is empty. <a href="/collections" style={{ color: 'var(--color-primary)' }}>Browse collections</a></p>
    </main>
  );
}
