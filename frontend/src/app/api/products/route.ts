export async function GET() {
  return Response.json([
    { id: 'p1', name: 'Banarasi Saree', slug: 'banarasi-saree', priceInr: 12999, currency: 'INR', category: 'saree', inStock: true },
    { id: 'p2', name: 'Embroidered Lehenga', slug: 'embroidered-lehenga', priceInr: 18999, currency: 'INR', category: 'lehenga', inStock: true },
    { id: 'p3', name: 'Silk Anarkali Kurta', slug: 'silk-anarkali-kurta', priceInr: 6999, currency: 'INR', category: 'kurta', inStock: true },
    { id: 'p4', name: 'Chanderi Dupatta Set', slug: 'chanderi-dupatta-set', priceInr: 4999, currency: 'INR', category: 'saree', inStock: true }
  ]);
}
