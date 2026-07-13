import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../../lib/supabase';

async function isAdmin(req: NextRequest): Promise<boolean> {
  const reqVal = req.cookies.get('admin_session')?.value ?? req.cookies.get('admin_token')?.value;
  if (reqVal) return true;
  try {
    const store = await cookies();
    return !!(store.get('admin_session')?.value ?? store.get('admin_token')?.value);
  } catch { return false; }
}

// DELETE /api/admin/reviews/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { error } = await sb.from('product_reviews').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
