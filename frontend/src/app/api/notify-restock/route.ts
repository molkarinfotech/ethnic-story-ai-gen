import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import {
  sendEmail,
  buildRestockSubscribedEmail,
  buildComingSoonSubscribedEmail,
} from '../../../lib/resend';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT    = 5;
const WINDOW_MINS   = 10;

/**
 * Rate-limit by persisting subscriber attempts in Supabase (restock_rate_limits table).
 * Falls back to allowing the request if the table doesn't exist yet.
 */
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const sb  = getServiceSupabase();
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINS * 60 * 1000).toISOString();

    const { count } = await sb
      .from('restock_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', windowStart);

    if ((count ?? 0) >= RATE_LIMIT) return false;

    // Record this attempt
    await sb.from('restock_rate_limits').insert({ ip });
    return true;
  } catch {
    // If table doesn't exist or any error, allow the request (fail open)
    return true;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const body = await req.json();
  const {
    email, productId, productName, productSlug,
    variantId, size, colour,
    notifyType = 'restock',
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
    notify_type:  notifyType,
  };

  const conflictCol = (!isComingSoon && variantId) ? 'email,variant_id' : 'email,product_id';

  const { error } = await sb.from('restock_notifications').upsert(
    record,
    { onConflict: conflictCol, ignoreDuplicates: true }
  );

  if (error) {
    console.error('[notify-restock] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
