import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signs/verifies the admin session cookie using HMAC-SHA256.
 *
 * The cookie value is stored as:  <token>.<signature>
 * where <token> is a random hex string set at login and
 * <signature> = HMAC-SHA256(token, ADMIN_SESSION_SECRET).
 *
 * This replaces the previous static string 'authenticated' which
 * could be forged by anyone who knew the cookie name.
 *
 * Env required: ADMIN_SESSION_SECRET  (min 32 random chars)
 * Falls back to ADMIN_PASSWORD if ADMIN_SESSION_SECRET is not set
 * (safe for existing deploys, but set the dedicated secret in production).
 */
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? 'change-me-in-production';

export function signToken(token: string): string {
  const sig = createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
  return `${token}.${sig}`;
}

export function verifyToken(signed: string): boolean {
  const dot = signed.lastIndexOf('.');
  if (dot === -1) return false;
  const token = signed.slice(0, dot);
  const givenSig = signed.slice(dot + 1);
  const expectedSig = createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(givenSig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}

export function isAdminAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')?.value;
  if (!cookie) return false;
  // Support legacy static value during transition (remove after first login cycle)
  if (cookie === 'authenticated') return false; // force re-login to get signed cookie
  return verifyToken(cookie);
}
