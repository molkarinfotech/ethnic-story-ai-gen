import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/admin-auth';

/**
 * Edge middleware — runs before every request.
 * Protects all /admin/* routes (except /admin/login) at the CDN edge,
 * so unauthenticated requests never reach page or API handlers.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate /admin/* routes
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Allow the login page and its API through unconditionally
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('admin_session')?.value;
  const authed = !!cookie && cookie !== 'authenticated' && verifyToken(cookie);

  if (!authed) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    // Preserve the original destination so we can redirect back after login
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all /admin routes.
     * Exclude Next.js internals and static files.
     */
    '/admin/:path*',
  ],
};
