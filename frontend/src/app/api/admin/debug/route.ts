import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '../../../../lib/admin-auth';

// Temporary debug route — shows which Supabase env vars are present (values masked)
// Visit /api/admin/debug after logging in to diagnose connection issues
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'POSTGRES_URL',
  ];

  const result: Record<string, string> = {};
  for (const v of vars) {
    const val = process.env[v];
    result[v] = val ? `SET (starts with: ${val.slice(0, 12)}…)` : 'NOT SET';
  }

  return NextResponse.json(result);
}
