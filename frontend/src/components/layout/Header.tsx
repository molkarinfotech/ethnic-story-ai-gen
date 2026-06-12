export function Header() {
  return (
    <header style={{ background: 'var(--color-primary)', color: '#fff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <a href="/" style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fff' }}>Ethnic Story</a>
      <nav style={{ display: 'flex', gap: '1.5rem' }}>
        <a href="/collections" style={{ color: '#fff', opacity: 0.9 }}>Collections</a>
        <a href="/account" style={{ color: '#fff', opacity: 0.9 }}>Account</a>
        <a href="/cart" style={{ color: '#fff', opacity: 0.9 }}>Cart</a>
      </nav>
    </header>
  );
}
