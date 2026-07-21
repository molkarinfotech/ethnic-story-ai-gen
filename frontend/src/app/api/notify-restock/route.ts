import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import { sendEmail, buildRestockSubscribedEmail } from '../../../lib/resend';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limiter: max 5 subscriptions per IP per 10 minutes
const ipMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS  = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const { email, productId, productName, productSlug, variantId, size, colour } = await req.json();

  if (!email || !productId || !productName) {
    return NextResponse.json({ error: 'email, productId, productName required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(String(email))) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (String(email).length > 254 || String(productName).length > 200) {
    return NextResponse.json({ error: 'Input too long' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Conflict key: if variant_id is known, deduplicate on email+variant_id;
  // otherwise fall back to email+product_id (global OOS case)
  const record: Record<string, unknown> = {
    email,
    product_id:   productId,
    product_name: productName,
    product_slug: productSlug ?? null,
    notified:     false,
    variant_id:   variantId  ?? null,
    size:         size       ?? null,
    colour:       colour     ?? null,
  };

  const conflictCol = variantId ? 'email,variant_id' : 'email,product_id';

  const { error } = await sb.from('restock_notifications').upsert(
    record,
    { onConflict: conflictCol, ignoreDuplicates: true }
  );

  if (error) {
    console.error('[notify-restock] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build a label that mentions the specific variant if known
  const variantLabel = [colour, size].filter(Boolean).join(' / ');
  const displayName  = variantLabel ? `${productName} (${variantLabel})` : productName;

  const emailPayload = buildRestockSubscribedEmail(displayName, email);
  sendEmail(emailPayload).catch(err => console.error('[notify-restock] Confirmation email failed:', err));

  return NextResponse.json({ subscribed: true });
}
