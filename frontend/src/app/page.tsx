export default function HomePage() {
  return (
    <main>
      <section style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1 style={{ fontSize: '2.5rem' }}>Welcome to Ethnic Story</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.7 }}>Curated Indian ethnic clothing for every occasion</p>
        <a href="/collections" style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.75rem 2rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px' }}>Shop Collections</a>
      </section>
    </main>
  );
}
