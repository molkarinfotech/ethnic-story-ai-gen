import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

// ── FAQ bank (mirrors ChatWidget.tsx so the API can answer them too) ──────────
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

// ── Product-search intent keywords ────────────────────────────────────────────
// If the message contains ANY of these, we attempt a product search.
const PRODUCT_SEARCH_TRIGGERS = [
  'show', 'find', 'looking for', 'want', 'need', 'search', 'browse',
  'do you have', 'do you sell', 'any', 'got any', 'kurta', 'saree', 'sari',
  'lehenga', 'dupatta', 'salwar', 'anarkali', 'kurti', 'ethnic', 'dress',
  'suit', 'top', 'bottom', 'red', 'blue', 'green', 'pink', 'yellow', 'white',
  'black', 'purple', 'orange', 'gold', 'silver', 'wedding', 'party', 'casual',
  'festive', 'formal', 'embroidered', 'printed', 'plain', 'solid', 'floral',
  'collection', 'new', 'sale', 'discount', 'recommend', 'suggest', 'popular',
  'new arrival', 'trending', 'best seller', 'gift',
];

function isProductQuery(lower: string): boolean {
  return PRODUCT_SEARCH_TRIGGERS.some(t => lower.includes(t));
}

// ── Extract meaningful search terms from the message ─────────────────────────
function extractSearchTerms(lower: string): string[] {
  // Strip common filler words, keeping nouns and adjectives useful for tag matching
  const stop = new Set([
    'i', 'me', 'my', 'we', 'you', 'a', 'an', 'the', 'is', 'are', 'was', 'do',
    'does', 'can', 'could', 'would', 'will', 'have', 'has', 'for', 'to', 'of',
    'in', 'on', 'at', 'by', 'or', 'and', 'but', 'with', 'some', 'any', 'it',
    'its', 'this', 'that', 'be', 'been', 'being', 'show', 'find', 'get', 'give',
    'want', 'need', 'like', 'looking', 'something', 'anything', 'please',
  ]);
  return lower
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w));
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  tags: string[] | null;
  category: string | null;
}

async function searchProducts(terms: string[]): Promise<Product[]> {
  if (!terms.length) return [];
  const sb = getServiceSupabase();

  // 1. Tag-based search: find products whose tags overlap with the search terms.
  //    Uses Postgres @> (contains) via .contains() — but we want ANY match,
  //    so we use .overlaps() for array columns.
  const { data: tagMatches } = await sb
    .from('products')
    .select('id, name, slug, price, image, tags, category')
    .eq('active', true)
    .overlaps('tags', terms)
    .order('created_at', { ascending: false })
    .limit(6);

  // 2. Name/category text search for terms the tags might not cover.
  const nameMatches: Product[] = [];
  for (const term of terms.slice(0, 3)) {
    const { data } = await sb
      .from('products')
      .select('id, name, slug, price, image, tags, category')
      .eq('active', true)
      .or(`name.ilike.%${term}%,category.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(4);
    if (data) nameMatches.push(...(data as Product[]));
  }

  // Merge, deduplicate, cap at 5 results
  const seen = new Set<string>();
  const merged: Product[] = [];
  for (const p of [...(tagMatches ?? []), ...nameMatches]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      merged.push(p as Product);
    }
    if (merged.length >= 5) break;
  }
  return merged;
}

export async function POST(req: NextRequest) {
  let body: { message?: string };
  try { body = await req.json(); } catch { body = {}; }

  const raw   = (body.message ?? '').trim();
  const lower = raw.toLowerCase();

  if (!raw) return NextResponse.json({ type: 'faq', answer: 'Please type a message!' });

  // ── Greetings ───────────────────────────────────────────────────────────────
  if (/\b(hello|hi|hey|g'day|howdy)\b/.test(lower)) {
    return NextResponse.json({
      type: 'faq',
      answer: 'Hello! 😊 How can I help you today? Ask me about sizing, delivery, returns, or what we have in stock!',
    });
  }
  if (/\bthank/.test(lower)) {
    return NextResponse.json({ type: 'faq', answer: 'You\'re welcome! Is there anything else I can help you with? 🌸' });
  }

  // ── FAQ matching ─────────────────────────────────────────────────────────────
  // Only run FAQ matching when the message doesn\'t look like a product search
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

  // ── Product search ───────────────────────────────────────────────────────────
  if (isProductQuery(lower)) {
    const terms    = extractSearchTerms(lower);
    const products = await searchProducts(terms);

    if (products.length > 0) {
      return NextResponse.json({ type: 'products', products });
    }

    // Product query but nothing found
    return NextResponse.json({
      type: 'faq',
      answer: 'I couldn\'t find any matching products right now. Try browsing our full collection, or use the 🔍 "Can\'t Find It?" button to send us a custom sourcing request!',
    });
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  return NextResponse.json({
    type: 'faq',
    answer: 'I\'m not sure about that one! Try one of the quick questions below, or use the 🔍 "Can\'t Find It?" button to send us a direct request.',
  });
}
