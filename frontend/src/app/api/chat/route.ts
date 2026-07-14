import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

// ── FAQ bank ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    keywords: ['size', 'sizing', 'xs', 'small', 'medium', 'large', 'xl', '2xl', '3xl', 'fit', 'measurements', 'measure'],
    a: 'We stock sizes XS–3XL across most styles. Each product page shows exact size availability. For custom sizing requests, use the sourcing form.',
  },
  {
    keywords: ['delivery', 'how long', 'days', 'weeks', 'arrive', 'arrival', 'when will', 'express', 'fast shipping', 'quick', 'standard shipping', 'business days', 'preorder', 'pre-order'],
    a: 'Standard Australia-wide delivery takes 3–7 business days. Pre-Order items ship directly from India and take 2–4 weeks. Express options are available at checkout.',
  },
  {
    keywords: ['international', 'internationally', 'overseas', 'outside australia', 'ship to', 'nz', 'new zealand', 'uk', 'usa', 'canada', 'worldwide', 'abroad', 'other countries'],
    a: 'We currently ship within Australia only. International shipping is coming soon — sign up to our newsletter to be notified.',
  },
  {
    keywords: ['return', 'refund', 'exchange', 'send back', 'wrong item', 'damaged', 'unworn', 'unwashed', '14 days', 'money back'],
    a: 'We accept returns within 14 days of delivery for unworn, unwashed items with original tags attached. Sale and pre-order items are final sale. Email returns@ethnicstory.com.au to start a return.',
  },
  {
    keywords: ['fabric', 'authentic', 'silk', 'chanderi', 'georgette', 'cotton', 'handcraft', 'artisan', 'traditional', 'block print', 'handmade', 'made in india', 'material', 'quality'],
    a: 'All pieces are handcrafted in India by skilled artisans using traditional techniques and authentic fabrics including pure silk, chanderi, georgette, and hand-block printed cotton.',
  },
  {
    keywords: ['afterpay', 'credit card', 'debit card', 'apple pay', 'buy now pay later', 'bnpl', 'visa', 'mastercard', 'how to pay', 'payment options'],
    a: 'Yes! We support Afterpay, as well as all major credit/debit cards and Apple Pay at checkout.',
  },
  {
    keywords: ['care', 'wash', 'washing', 'clean', 'dry clean', 'hand wash', 'laundry', 'iron', 'ironing', 'delicate'],
    a: 'Most silk and embroidered pieces should be dry-cleaned. Cotton kurtas and casual wear can be hand-washed in cold water. Care instructions are on each garment label.',
  },
  {
    keywords: ['track', 'tracking', 'where is my order', 'order status', 'my order', 'shipped', 'dispatched', 'tracking link', 'tracking number', 'courier'],
    a: 'Once your order ships you will receive a tracking link via email. You can also log in to your account to view order status anytime.',
  },
];

// ── Category / gender keyword maps ────────────────────────────────────────────
// Maps words a shopper might say → the value stored in the DB column
const CATEGORY_MAP: Record<string, string> = {
  saree: 'sarees',
  sarees: 'sarees',
  sari: 'sarees',
  saris: 'sarees',
  lehenga: 'lehengas',
  lehengas: 'lehengas',
  lehnga: 'lehengas',
  kurta: 'kurtas',
  kurtas: 'kurtas',
  kurti: 'kurtas',
  kurtis: 'kurtas',
  salwar: 'kurtas',
  anarkali: 'kurtas',
  sherwani: 'sherwanis',
  sherwanis: 'sherwanis',
  dupatta: 'accessories',
  jewellery: 'accessories',
  jewelry: 'accessories',
  accessories: 'accessories',
};

const GENDER_MAP: Record<string, string> = {
  women: 'women',
  woman: 'women',
  ladies: 'women',
  female: 'women',
  girl: 'women',
  girls: 'women',
  men: 'men',
  man: 'men',
  male: 'men',
  gents: 'men',
  boys: 'men',
  kids: 'kids',
  kid: 'kids',
  children: 'kids',
  child: 'kids',
  baby: 'kids',
};

// ── Product-search intent triggers ────────────────────────────────────────────
const PRODUCT_SEARCH_TRIGGERS = [
  'show', 'find', 'looking for', 'want', 'need', 'search', 'browse',
  'do you have', 'do you sell', 'any', 'got any', 'have you got',
  ...Object.keys(CATEGORY_MAP),
  ...Object.keys(GENDER_MAP),
  'ethnic', 'dress', 'outfit', 'collection', 'new', 'sale', 'discount',
  'recommend', 'suggest', 'popular', 'new arrival', 'trending', 'best seller',
  'wedding', 'party', 'festive', 'casual', 'formal', 'gift',
  'red', 'blue', 'green', 'pink', 'yellow', 'white', 'black', 'purple',
  'orange', 'gold', 'silver', 'embroidered', 'printed', 'plain', 'floral',
];

function isProductQuery(lower: string): boolean {
  return PRODUCT_SEARCH_TRIGGERS.some(t => lower.includes(t));
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: string | null;
  gender: string | null;
  badge: string | null;
}

async function searchProducts(lower: string): Promise<Product[]> {
  const sb = getServiceSupabase();

  // Detect category and gender from the message
  const detectedCategory = Object.keys(CATEGORY_MAP).find(k => lower.includes(k))
    ? CATEGORY_MAP[Object.keys(CATEGORY_MAP).find(k => lower.includes(k))!]
    : null;

  const detectedGender = Object.keys(GENDER_MAP).find(k => lower.includes(k))
    ? GENDER_MAP[Object.keys(GENDER_MAP).find(k => lower.includes(k))!]
    : null;

  // Build query using real columns: name, category, gender, subtitle
  let query = sb
    .from('products')
    .select('id, name, slug, price, image, category, gender, badge')
    .order('created_at', { ascending: false })
    .limit(8);

  if (detectedCategory) {
    query = query.eq('category', detectedCategory);
  }
  if (detectedGender) {
    query = query.eq('gender', detectedGender);
  }

  const { data: filtered, error: filteredErr } = await query;

  // If we got results from category/gender filters, return them
  if (!filteredErr && filtered && filtered.length > 0) {
    return (filtered as Product[]).slice(0, 5);
  }

  // Fallback: text search across name and subtitle for any meaningful word
  const stopWords = new Set([
    'i', 'me', 'my', 'we', 'you', 'a', 'an', 'the', 'is', 'are', 'was', 'do',
    'does', 'can', 'could', 'would', 'will', 'have', 'has', 'for', 'to', 'of',
    'in', 'on', 'at', 'by', 'or', 'and', 'but', 'with', 'some', 'any', 'it',
    'its', 'this', 'that', 'be', 'been', 'show', 'find', 'get', 'give', 'want',
    'need', 'like', 'looking', 'something', 'anything', 'please', 'do', 'you',
    'have', 'got', 'sell',
  ]);
  const terms = lower
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 3);

  if (!terms.length) return [];

  const seen = new Set<string>();
  const results: Product[] = [];

  for (const term of terms) {
    const { data } = await sb
      .from('products')
      .select('id, name, slug, price, image, category, gender, badge')
      .or(`name.ilike.%${term}%,subtitle.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(4);
    for (const p of (data ?? [])) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        results.push(p as Product);
      }
      if (results.length >= 5) break;
    }
    if (results.length >= 5) break;
  }

  // Last resort: return newest products
  if (!results.length) {
    const { data: newest } = await sb
      .from('products')
      .select('id, name, slug, price, image, category, gender, badge')
      .order('created_at', { ascending: false })
      .limit(5);
    return (newest ?? []) as Product[];
  }

  return results;
}

export async function POST(req: NextRequest) {
  let body: { message?: string };
  try { body = await req.json(); } catch { body = {}; }

  const raw   = (body.message ?? '').trim();
  const lower = raw.toLowerCase();

  if (!raw) return NextResponse.json({ type: 'faq', answer: 'Please type a message!' });

  // ── Greetings ────────────────────────────────────────────────────────────────
  if (/\b(hello|hi|hey|g'day|howdy)\b/.test(lower)) {
    return NextResponse.json({
      type: 'faq',
      answer: 'Hello! 😊 How can I help you today? Ask me about sizing, delivery, returns, or what we have in stock!',
    });
  }
  if (/\bthank/.test(lower)) {
    return NextResponse.json({ type: 'faq', answer: 'You\'re welcome! Is there anything else I can help you with? 🌸' });
  }

  // ── FAQ matching (only when not a product query) ──────────────────────────────
  if (!isProductQuery(lower)) {
    let bestFaq: (typeof FAQS)[number] | null = null;
    let bestScore = 0;
    for (const faq of FAQS) {
      let score = 0;
      for (const kw of faq.keywords) {
        if (lower.includes(kw)) score += kw.length;
      }
      if (score > bestScore) { bestScore = score; bestFaq = faq; }
    }
    if (bestFaq && bestScore > 0) {
      return NextResponse.json({ type: 'faq', answer: bestFaq.a });
    }
  }

  // ── Product search ────────────────────────────────────────────────────────────
  if (isProductQuery(lower)) {
    try {
      const products = await searchProducts(lower);
      if (products.length > 0) {
        return NextResponse.json({ type: 'products', products });
      }
    } catch (err) {
      console.error('[chat] product search error:', err);
    }
    return NextResponse.json({
      type: 'faq',
      answer: 'I couldn\'t find any matching products right now. Try browsing our full collection, or use the 🔍 "Can\'t Find It?" button to send us a custom sourcing request!',
    });
  }

  // ── Fallback ──────────────────────────────────────────────────────────────────
  return NextResponse.json({
    type: 'faq',
    answer: 'I\'m not sure about that one! Try one of the quick questions below, or use the 🔍 "Can\'t Find It?" button to send us a direct request.',
  });
}
