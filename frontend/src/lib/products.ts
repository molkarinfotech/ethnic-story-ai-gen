// ============================================================
// PRODUCT CATALOGUE — Ethnic Story
// ============================================================

export type Gender = 'women' | 'men' | 'kids' | 'unisex';

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  price: number;          // AUD
  originalPrice?: number; // AUD
  original_price?: number;
  category: string;
  gender?: Gender;
  badge?: string;
  image?: string;
  images?: string[];      // additional gallery images
  selectedSize?: string;  // set when added to cart
};

export const PRODUCTS: Product[] = [
  // ── TEST ──────────────────────────────────────────────────────
  {
    id: 'p00', slug: 'test-payment-item',
    name: '🧪 Test Payment Item',
    subtitle: 'Use this to verify Stripe integration — remove before going live',
    price: 1,
    category: 'sarees', gender: 'women', badge: 'Test',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop',
  },

  // ── SAREES ──────────────────────────────────────────────────
  {
    id: 'p01', slug: 'banarasi-silk-saree',
    name: 'Banarasi Silk Saree',
    subtitle: 'Pure silk with gold zari border',
    price: 189, originalPrice: 229,
    category: 'sarees', gender: 'women', badge: 'Bestseller',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p02', slug: 'kanjivaram-silk-saree',
    name: 'Kanjivaram Silk Saree',
    subtitle: 'Temple border weave, traditional motifs',
    price: 275,
    category: 'sarees', gender: 'women',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p03', slug: 'chanderi-cotton-saree',
    name: 'Chanderi Cotton Saree',
    subtitle: 'Lightweight with delicate gold motifs',
    price: 69, originalPrice: 89,
    category: 'sarees', gender: 'women', badge: 'Sale',
    image: 'https://images.unsplash.com/photo-1583404398469-1f9f327a8574?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p04', slug: 'georgette-printed-saree',
    name: 'Georgette Printed Saree',
    subtitle: 'Vibrant floral digital print',
    price: 49,
    category: 'sarees', gender: 'women',
    image: 'https://images.unsplash.com/photo-1583017777700-a5a0e5d03f24?q=80&w=800&auto=format&fit=crop',
  },

  // ── LEHENGAS ──────────────────────────────────────────────
  {
    id: 'p05', slug: 'bridal-lehenga-red',
    name: 'Bridal Lehenga – Red',
    subtitle: 'Heavy embroidered silk, bridal collection',
    price: 579,
    category: 'lehengas', gender: 'women', badge: 'Premium',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4b9f8e?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p06', slug: 'mirror-work-lehenga',
    name: 'Mirror Work Lehenga',
    subtitle: 'Rajasthani folk art style',
    price: 239, originalPrice: 279,
    category: 'lehengas', gender: 'women', badge: 'New',
    image: 'https://images.unsplash.com/photo-1591164867150-f9d20a7a3031?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p07', slug: 'pastel-floral-lehenga',
    name: 'Pastel Floral Lehenga',
    subtitle: 'Soft georgette with thread embroidery',
    price: 159,
    category: 'lehengas', gender: 'women',
    image: 'https://images.unsplash.com/photo-1620912189875-f5a3c2c3f91e?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p08', slug: 'velvet-lehenga-navy',
    name: 'Velvet Lehenga – Navy',
    subtitle: 'Rich velvet with gold zardozi work',
    price: 379,
    category: 'lehengas', gender: 'women',
    image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?q=80&w=800&auto=format&fit=crop',
  },

  // ── KURTAS (Women) ───────────────────────────────────────────
  {
    id: 'p09', slug: 'silk-anarkali-kurta',
    name: 'Silk Anarkali Kurta',
    subtitle: 'Floor-length with churidar set',
    price: 89, originalPrice: 109,
    category: 'kurtas', gender: 'women', badge: 'Sale',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p10', slug: 'cotton-block-print-kurta',
    name: 'Block Print Kurta Set',
    subtitle: 'Jaipur hand-block printed cotton',
    price: 39,
    category: 'kurtas', gender: 'women', badge: 'New',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p11', slug: 'indo-western-coord',
    name: 'Indo-Western Co-ord Set',
    subtitle: 'Crop top + wide-leg palazzo trousers',
    price: 59,
    category: 'kurtas', gender: 'women',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p12', slug: 'lucknowi-chikankari-kurta',
    name: 'Lucknowi Chikankari Kurta',
    subtitle: 'Hand-embroidered white cotton',
    price: 49, originalPrice: 59,
    category: 'kurtas', gender: 'women',
    image: 'https://images.unsplash.com/photo-1583404398469-1f9f327a8574?q=80&w=800&auto=format&fit=crop',
  },

  // ── KURTAS (Men) ─────────────────────────────────────────────
  {
    id: 'p17', slug: 'mens-nehru-jacket-set',
    name: 'Nehru Jacket Kurta Set',
    subtitle: 'Silk blend with Nehru collar jacket',
    price: 69,
    category: 'kurtas', gender: 'men', badge: 'New',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p18', slug: 'mens-linen-kurta',
    name: 'Linen Straight Kurta',
    subtitle: 'Relaxed everyday wear in premium linen',
    price: 45,
    category: 'kurtas', gender: 'men',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop',
  },

  // ── SHERWANIS (Men) ───────────────────────────────────────────
  {
    id: 'p19', slug: 'ivory-sherwani-set',
    name: 'Ivory Sherwani Set',
    subtitle: 'Groom & wedding guest collection',
    price: 349,
    category: 'sherwanis', gender: 'men', badge: 'Premium',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p20', slug: 'navy-embroidered-sherwani',
    name: 'Navy Embroidered Sherwani',
    subtitle: 'Rich thread-work on deep navy fabric',
    price: 279, originalPrice: 319,
    category: 'sherwanis', gender: 'men',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=800&auto=format&fit=crop',
  },

  // ── KIDS ─────────────────────────────────────────────────
  {
    id: 'p13', slug: 'kids-lehenga-pink',
    name: 'Girls Lehenga – Pink',
    subtitle: 'Festive wear, ages 3–10',
    price: 39,
    category: 'lehengas', gender: 'kids', badge: 'Bestseller',
    image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p14', slug: 'kids-sherwani-gold',
    name: 'Boys Sherwani – Gold',
    subtitle: 'Wedding collection, ages 2–12',
    price: 45,
    category: 'sherwanis', gender: 'kids',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p15', slug: 'kids-kurta-pyjama',
    name: 'Boys Kurta Pyjama Set',
    subtitle: 'Soft cotton, easy-wear, ages 1–8',
    price: 19, originalPrice: 25,
    category: 'kurtas', gender: 'kids', badge: 'Sale',
    image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'p16', slug: 'girls-saree-style-gown',
    name: 'Girls Saree-Style Gown',
    subtitle: 'Ready-to-wear elegant gown, ages 5–14',
    price: 35,
    category: 'sarees', gender: 'kids',
    image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=800&auto=format&fit=crop',
  },
];

// ── Currency helper ──
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(amount);
}
