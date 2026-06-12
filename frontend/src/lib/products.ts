// ============================================================
// PRODUCT CATALOGUE — Ethnic Story
// ============================================================
// HOW TO ADD YOUR OWN PRODUCT IMAGES:
// Option A – Local files:
//   1. Place your image in /public/images/products/
//   2. Set image: '/images/products/my-saree.jpg'
// Option B – Cloud (Cloudinary / Supabase / S3):
//   1. Upload image and copy the CDN URL
//   2. Paste the full URL into the image field below
// ============================================================

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  price: number;        // AUD
  originalPrice?: number; // AUD
  category: string;
  badge?: string;
  image?: string;
};

export const PRODUCTS: Product[] = [
  // ── SAREES ──────────────────────────────────────────────────────
  {
    id: 'p01', slug: 'banarasi-silk-saree',
    name: 'Banarasi Silk Saree',
    subtitle: 'Pure silk with gold zari border',
    price: 189, originalPrice: 229,
    category: 'sarees', badge: 'Bestseller',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p02', slug: 'kanjivaram-silk-saree',
    name: 'Kanjivaram Silk Saree',
    subtitle: 'Temple border weave, traditional motifs',
    price: 275,
    category: 'sarees',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p03', slug: 'chanderi-cotton-saree',
    name: 'Chanderi Cotton Saree',
    subtitle: 'Lightweight with delicate gold motifs',
    price: 69, originalPrice: 89,
    category: 'sarees', badge: 'Sale',
    image: 'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p04', slug: 'georgette-printed-saree',
    name: 'Georgette Printed Saree',
    subtitle: 'Vibrant floral digital print',
    price: 49,
    category: 'sarees',
    image: 'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=600&auto=format&fit=crop',
  },

  // ── LEHENGAS ───────────────────────────────────────────────
  {
    id: 'p05', slug: 'bridal-lehenga-red',
    name: 'Bridal Lehenga – Red',
    subtitle: 'Heavy embroidered silk, bridal collection',
    price: 579,
    category: 'lehengas', badge: 'Premium',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p06', slug: 'mirror-work-lehenga',
    name: 'Mirror Work Lehenga',
    subtitle: 'Rajasthani folk art style',
    price: 239, originalPrice: 279,
    category: 'lehengas', badge: 'New',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p07', slug: 'pastel-floral-lehenga',
    name: 'Pastel Floral Lehenga',
    subtitle: 'Soft georgette with thread embroidery',
    price: 159,
    category: 'lehengas',
    image: 'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p08', slug: 'velvet-lehenga-navy',
    name: 'Velvet Lehenga – Navy',
    subtitle: 'Rich velvet with gold zardozi work',
    price: 379,
    category: 'lehengas',
    image: 'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=600&auto=format&fit=crop',
  },

  // ── KURTAS ────────────────────────────────────────────────
  {
    id: 'p09', slug: 'silk-anarkali-kurta',
    name: 'Silk Anarkali Kurta',
    subtitle: 'Floor-length with churidar set',
    price: 89, originalPrice: 109,
    category: 'kurtas', badge: 'Sale',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p10', slug: 'cotton-block-print-kurta',
    name: 'Block Print Kurta Set',
    subtitle: 'Jaipur hand-block printed cotton',
    price: 39,
    category: 'kurtas', badge: 'New',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p11', slug: 'indo-western-coord',
    name: 'Indo-Western Co-ord Set',
    subtitle: 'Crop top + wide-leg palazzo trousers',
    price: 59,
    category: 'kurtas',
    image: 'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p12', slug: 'lucknowi-chikankari-kurta',
    name: 'Lucknowi Chikankari Kurta',
    subtitle: 'Hand-embroidered white cotton',
    price: 49, originalPrice: 59,
    category: 'kurtas',
    image: 'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=600&auto=format&fit=crop',
  },

  // ── KIDS ──────────────────────────────────────────────────
  {
    id: 'p13', slug: 'kids-lehenga-pink',
    name: 'Girls Lehenga – Pink',
    subtitle: 'Festive wear, ages 3–10',
    price: 39,
    category: 'kids', badge: 'Bestseller',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p14', slug: 'kids-sherwani-gold',
    name: 'Boys Sherwani – Gold',
    subtitle: 'Wedding collection, ages 2–12',
    price: 45,
    category: 'kids',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p15', slug: 'kids-kurta-pyjama',
    name: 'Boys Kurta Pyjama Set',
    subtitle: 'Soft cotton, easy-wear, ages 1–8',
    price: 19, originalPrice: 25,
    category: 'kids', badge: 'Sale',
    image: 'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'p16', slug: 'girls-saree-style-gown',
    name: 'Girls Saree-Style Gown',
    subtitle: 'Ready-to-wear elegant gown, ages 5–14',
    price: 35,
    category: 'kids',
    image: 'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=600&auto=format&fit=crop',
  },
];

// ── Currency helper ──
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(amount);
}
