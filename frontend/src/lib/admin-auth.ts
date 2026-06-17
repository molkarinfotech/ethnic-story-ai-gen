import { NextRequest } from 'next/server';

/**
 * Checks the `admin_session` httpOnly cookie that is set by POST /api/admin/login.
 * The login route sets the value to the literal string "authenticated" after
 * verifying the submitted password against process.env.ADMIN_PASSWORD.
 *
 * All admin API routes should call: if (!isAdminAuthed(req)) return 401
 */
export function isAdminAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')?.value;
  return cookie === 'authenticated';
}
