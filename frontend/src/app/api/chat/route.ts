import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

// ── Category / gender keyword maps ────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  saree: 'sarees', sarees: 'sarees', sari: 'sarees', saris: 'sarees',
  lehenga: 'lehengas', lehengas: 'lehengas', lehnga: 'lehengas',
  kurta: 'kurtas', kurtas: 'kurtas', kurti: 'kurtas', kurtis: 'kurtas',
  salwar: 'kurtas', anarkali: 'kurtas',
  sherwani: 'sherwanis', sherwanis: 'sherwanis',
  dupatta: 'accessories', jewellery: 'accessories', jewelry: 'accessories',
  accessories: 'accessories',
};

const GENDER_MAP: Record<string, string> = {
  women: 'women', woman: 'women', ladies: 'women', female: 'women', girl: 'women', girls: 'women',
  men: 'men', man: 'men', male: 'men', gents: 'men', boys: 'men',
  kids: 'kids', kid: 'kids', children: 'kids', child: 'kids', baby: 'kids',
};

const PRODUCT_SEARCH_TRIGGERS = [
  'show', 'find', 'looking for', 'want', 'need', 'search', 'browse',
  'do you have', 'do you sell', 'any', 'got any', 'have you got',
  ...Object.keys(CATEGORY_MAP), ...Object.keys(GENDER_MAP),
  'ethnic', 'dress', 'outfit', 'collection', 'new arrival', 'trending',
  'recommend', 'suggest', 'popular', 'best seller', 'sale', 'discount',
  'wedding', 'party', 'festive', 'casual', 'formal', 'gift',
  'red', 'blue', 'green', 'pink', 'yellow', 'white', 'black', 'purple',
  'orange', 'gold', 'silver', 'embroidered', 'printed', 'plain', 'floral',
];

function isProductQuery(lower: string): boolean {
  return PRODUCT_SEARCH_TRIGGERS.some(t => lower.includes(t));
}

// ── KB lookup ────────────────────────────────────────────────────────────────────
type KbEntry = { id: string; topic: string; content: string; tags: string };

async function findKbAnswer(lower: string): Promise<string | null> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('chatbot_kb')
    .select('id, topic, content, tags');

  if (error || !data?.length) return null;

  // Score each entry: match words in the user message against topic words and tags
  const stopWords = new Set([
    'i', 'me', 'my', 'we', 'you', 'a', 'an', 'the', 'is', 'are', 'was', 'do', 'does',
    'can', 'could', 'would', 'will', 'have', 'has', 'for', 'to', 'of', 'in', 'on', 'at',
    'by', 'or', 'and', 'but', 'with', 'it', 'its', 'this', 'that', 'be', 'been', 'about',
    'what', 'how', 'when', 'where', 'why', 'who', 'your', 'please', 'tell', 'know',
  ]);
  const msgWords = lower
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));

  if (!msgWords.length) return null;

  let best: KbEntry | null = null;
  let bestScore = 0;

  for (const entry of data as KbEntry[]) {
    const tagList = entry.tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    const topicWords = entry.topic
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    let score = 0;
    for (const word of msgWords) {
      // Exact tag match scores highest
      if (tagList.includes(word)) score += 10;
      // Partial tag match
      else if (tagList.some(t => t.includes(word) || word.includes(t))) score += 5;
      // Topic word match
      if (topicWords.some(t => t.includes(word) || word.includes(t))) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  // Require a minimum confidence score to avoid irrelevant matches
  return bestScore >= 5 ? best!.content : null;
}

// ── Product search ─────────────────────────────────────────────────────────────────
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

  const detectedCategory = Object.keys(CATEGORY_MAP).find(k => lower.includes(k))
    ? CATEGORY_MAP[Object.keys(CATEGORY_MAP).find(k => lower.includes(k))!]
    : null;

  const detectedGender = Object.keys(GENDER_MAP).find(k => lower.includes(k))
    ? GENDER_MAP[Object.keys(GENDER_MAP).find(k => lower.includes(k))!]
    : null;

  let query = sb
    .from('products')
    .select('id, name, slug, price, image, category, gender, badge')
    .order('created_at', { ascending: false })
    .limit(8);

  if (detectedCategory) query = query.eq('category', detectedCategory);
  if (detectedGender)   query = query.eq('gender', detectedGender);

  const { data: filtered, error: filteredErr } = await query;

  if (!filteredErr && filtered && filtered.length > 0) {
    return (filtered as Product[]).slice(0, 5);
  }

  // Fallback: ilike search on name / subtitle
  const stopWords = new Set([
    'i', 'me', 'a', 'an', 'the', 'is', 'are', 'do', 'does', 'for', 'to', 'of', 'in',
    'on', 'or', 'and', 'with', 'it', 'show', 'find', 'get', 'want', 'need', 'like',
    'looking', 'something', 'anything', 'please', 'have', 'got', 'sell', 'you', 'any',
  ]);
  const terms = lower
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 3);

  if (!terms.length) {
    const { data: newest } = await sb
      .from('products')
      .select('id, name, slug, price, image, category, gender, badge')
      .order('created_at', { ascending: false })
      .limit(5);
    return (newest ?? []) as Product[];
  }

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
      if (!seen.has(p.id)) { seen.add(p.id); results.push(p as Product); }
      if (results.length >= 5) break;
    }
    if (results.length >= 5) break;
  }

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

// ── Main handler ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { message?: string };
  try { body = await req.json(); } catch { body = {}; }

  const raw   = (body.message ?? '').trim();
  const lower = raw.toLowerCase();

  if (!raw) return NextResponse.json({ type: 'faq', answer: 'Please type a message!' });

  // Greetings
  if (/\b(hello|hi|hey|g'day|howdy)\b/.test(lower)) {
    return NextResponse.json({
      type: 'faq',
      answer: 'Hello! 😊 How can I help you today? Ask me about sizing, delivery, returns, or what we have in stock!',
    });
  }
  if (/\bthank/.test(lower)) {
    return NextResponse.json({ type: 'faq', answer: 'You\'re welcome! Is there anything else I can help you with? 🌸' });
  }

  // Product search takes priority when clear product intent is detected
  if (isProductQuery(lower)) {
    // But first check if KB has a relevant answer (e.g. "do you have sarees" → KB policy vs products)
    // Only skip KB if the query is clearly "show me X" style browsing
    const browsingIntent = /\b(show|browse|find|search|looking for|any|got any|do you sell|do you have|recommend|suggest)\b/.test(lower);

    if (!browsingIntent) {
      // Could be "how much are sarees" or "what sarees do you have" — check KB first
      const kbAnswer = await findKbAnswer(lower);
      if (kbAnswer) return NextResponse.json({ type: 'faq', answer: kbAnswer });
    }

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

  // KB lookup for all non-product queries
  const kbAnswer = await findKbAnswer(lower);
  if (kbAnswer) return NextResponse.json({ type: 'faq', answer: kbAnswer });

  // Fallback
  return NextResponse.json({
    type: 'faq',
    answer: 'I\'m not sure about that one! Try one of the quick questions below, or use the 🔍 "Can\'t Find It?" button to send us a direct request.',
  });
}
