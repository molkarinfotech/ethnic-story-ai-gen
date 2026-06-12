export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <main>
      <h1>Product: {params.slug}</h1>
      <p style={{ opacity: 0.6 }}>Product detail page - coming soon.</p>
    </main>
  );
}
