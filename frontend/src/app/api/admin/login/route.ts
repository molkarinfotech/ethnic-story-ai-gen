import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { signToken } from '../../../../lib/admin-auth';

// In-memory brute-force protection: max 10 failed attempts per IP per 15 minutes
const failMap = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILS   = 10;
const LOCKOUT_MS  = 15 * 60 * 1000;

function recordFail(ip: string): number {
  const now = Date.now();
  const entry = failMap.get(ip);
  if (!entry || now > entry.resetAt) {
    failMap.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
    return 1;
  }
  entry.count++;
  return entry.count;
}

function isLockedOut(ip: string): boolean {
  const now = Date.now();
  const entry = failMap.get(ip);
  if (!entry || now > entry.resetAt) return false;
  return entry.count >= MAX_FAILS;
}

function clearFails(ip: string): void {
  failMap.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isLockedOut(ip)) {
    return NextResponse.json({ error: 'Too many failed attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  const { password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    const fails = recordFail(ip);
    // Artificial delay to slow brute force (1 second)
    await new Promise(r => setTimeout(r, 1000));
    const remaining = MAX_FAILS - fails;
    return NextResponse.json(
      { error: remaining > 0 ? `Invalid password (${remaining} attempts remaining)` : 'Account locked. Try again in 15 minutes.' },
      { status: 401 }
    );
  }

  clearFails(ip);

  // Issue a signed session token
  const token  = randomBytes(32).toString('hex');
  const signed = signToken(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', '', { maxAge: 0, path: '/' });
  res.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  return res;
}
