import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';

async function isAdmin(req: NextRequest): Promise<boolean> {
  const reqVal = req.cookies.get('admin_session')?.value ?? req.cookies.get('admin_token')?.value;
  if (reqVal) return true;
  try {
    const store = await cookies();
    return !!(store.get('admin_session')?.value ?? store.get('admin_token')?.value);
  } catch { return false; }
}

// GET /api/admin/reviews — all reviews joined with product + profile names
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_reviews')
    .select('id, product_id, user_id, rating, body, created_at, updated_at, products(name, slug), profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const reviews = (data ?? []).map((r: any) => ({
    ...r,
    productName: r.products?.name ?? null,
    productSlug: r.products?.slug ?? null,
    userName: r.profiles?.display_name ?? null,
    products: undefined,
    profiles: undefined,
  }));
  return NextResponse.json({ reviews });
}
