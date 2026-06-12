import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      { slug: 'banarasi-saree', name: 'Banarasi Saree', description: 'Handwoven Banarasi silk saree with zari work', category: 'saree', priceInr: 12999, currency: 'INR', inStock: true },
      { slug: 'embroidered-lehenga', name: 'Embroidered Lehenga', description: 'Festive lehenga with intricate thread embroidery', category: 'lehenga', priceInr: 18999, currency: 'INR', inStock: true },
      { slug: 'silk-anarkali-kurta', name: 'Silk Anarkali Kurta', description: 'Floor-length anarkali in pure silk', category: 'kurta', priceInr: 6999, currency: 'INR', inStock: true },
      { slug: 'chanderi-dupatta-set', name: 'Chanderi Dupatta Set', description: 'Light Chanderi fabric with printed dupatta', category: 'saree', priceInr: 4999, currency: 'INR', inStock: true },
    ],
  });
  console.log('Database seeded successfully');
}

main().finally(() => prisma.$disconnect());
