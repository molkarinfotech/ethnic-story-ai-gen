import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge-compatible HMAC-SHA256 verification using the Web Crypto API.
 * Cannot import admin-auth.ts here because it uses the Node.js 'crypto'
 * module which is unavailable in the Edge Runtime.
 */
async function verifyAdminCookie(signed: string): Promise<boolean> {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? '';
    if (!secret) return false;

    const dot = signed.lastIndexOf('.');
    if (dot === -1) return false;

    const token     = signed.slice(0, dot);
    const givenHex  = signed.slice(dot + 1);

    const enc     = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(token);

    const key = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );

    // Convert the hex signature back to bytes for comparison
    const givenBytes = new Uint8Array(
      givenHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
    );

    return await crypto.subtle.verify('HMAC', key, givenBytes, msgData);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate /admin/* routes
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Allow the login page and its API through unconditionally
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('admin_session')?.value;

  // Reject missing cookie or legacy static value
  if (!cookie || cookie === 'authenticated') {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const authed = await verifyAdminCookie(cookie);
  if (!authed) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
