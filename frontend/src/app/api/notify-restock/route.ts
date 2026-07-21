import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import {
  sendEmail,
  buildRestockSubscribedEmail,
  buildComingSoonSubscribedEmail,
} from '../../../lib/resend';

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

  const body = await req.json();
  const {
    email, productId, productName, productSlug,
    variantId, size, colour,
    notifyType = 'restock',   // 'restock' | 'coming_soon'
  } = body;

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

  // For coming_soon notifications there is no specific variant;
  // deduplicate on email + product_id.
  const isComingSoon = notifyType === 'coming_soon';

  const record: Record<string, unknown> = {
    email,
    product_id:   productId,
    product_name: productName,
    product_slug: productSlug ?? null,
    notified:     false,
    variant_id:   isComingSoon ? null : (variantId  ?? null),
    size:         isComingSoon ? null : (size       ?? null),
    colour:       isComingSoon ? null : (colour     ?? null),
    notify_type:  notifyType,   // stored in DB for admin filtering
  };

  // Always deduplicate on email + product_id so a Coming Soon
  // product doesn't produce duplicate rows across multiple clicks.
  const conflictCol = (!isComingSoon && variantId)
    ? 'email,variant_id'
    : 'email,product_id';

  const { error } = await sb.from('restock_notifications').upsert(
    record,
    { onConflict: conflictCol, ignoreDuplicates: true }
  );

  if (error) {
    console.error('[notify-restock] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send appropriate confirmation email
  const variantLabel = [colour, size].filter(Boolean).join(' / ');
  const displayName  = variantLabel ? `${productName} (${variantLabel})` : productName;

  const emailPayload = isComingSoon
    ? buildComingSoonSubscribedEmail(displayName, email)
    : buildRestockSubscribedEmail(displayName, email);

  sendEmail(emailPayload).catch(err =>
    console.error('[notify-restock] Confirmation email failed:', err)
  );

  return NextResponse.json({ subscribed: true });
}
