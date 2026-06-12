export default function CheckoutSuccessPage() {
  return (
    <main>
      <div className="order-success" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-16) var(--space-4)' }}>
        <div className="order-success__icon">🎊</div>
        <h2>Order placed successfully!</h2>
        <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '40ch' }}>
          Thank you for shopping with Ethnic Story. You’ll receive a confirmation email shortly.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/" className="btn btn-primary">Continue shopping</a>
          <a href="/collections" className="btn btn--outline">Browse collections</a>
        </div>
      </div>
    </main>
  );
}
