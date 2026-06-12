export default function CollectionsPage() {
  const collections = [
    { name: 'Sarees', slug: 'sarees', description: 'Timeless drapes for every occasion' },
    { name: 'Lehengas', slug: 'lehengas', description: 'Festive and bridal collections' },
    { name: 'Kurtas', slug: 'kurtas', description: 'Everyday ethnic comfort' },
    { name: 'Kids', slug: 'kids', description: 'Ethnic wear for little ones' },
  ];
  return (
    <main>
      <h1>Collections</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {collections.map(c => (
          <a key={c.slug} href={`/collections/${c.slug}`} style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '8px', display: 'block' }}>
            <h2 style={{ margin: '0 0 0.5rem' }}>{c.name}</h2>
            <p style={{ margin: 0, opacity: 0.7 }}>{c.description}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
