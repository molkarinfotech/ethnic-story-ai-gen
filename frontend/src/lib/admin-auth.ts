import { NextRequest } from 'next/server';

export function isAdminAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_token')?.value;
  return cookie === process.env.ADMIN_PASSWORD;
}
