export default function AccountPage() {
  return (
    <main>
      <div className="page-header">
        <p className="page-header__eyebrow">Your Account</p>
        <h1>Welcome Back</h1>
      </div>
      <div className="container section">
        <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👤</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Sign in to your account</h2>
          <p style={{ color: 'var(--color-muted)', fontFamily: 'system-ui', marginBottom: '2rem' }}>Authentication coming in the next build. Track orders, manage wishlist, and more.</p>
          <button className="btn btn--primary" style={{ width: '100%', marginBottom: '1rem' }}>Sign In</button>
          <button className="btn btn--outline" style={{ width: '100%' }}>Create Account</button>
        </div>
      </div>
    </main>
  );
}
