import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';

/**
 * Unified admin auth — same logic as stock/route.ts.
 * Accepts any truthy admin_session or admin_token cookie.
 */
async function isAdmin(req: NextRequest): Promise<boolean> {
  const reqCookie = req.cookies.get('admin_session')?.value
    ?? req.cookies.get('admin_token')?.value;
  if (reqCookie && reqCookie !== '') return true;
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get('admin_session')?.value
      ?? cookieStore.get('admin_token')?.value;
    return !!val;
  } catch {
    return false;
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? '';

  const sb = getServiceSupabase();
  let query = sb
    .from('products')
    .select('id, name, slug, category, subcategory, gender, price, original_price, badge, image, in_stock, stock_count, created_at')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = (data ?? []) as Record<string, unknown>[];
  if (products.length === 0) return NextResponse.json([]);

  const ids = products.map(p => p.id as string);
  const { data: imgRows } = await sb
    .from('product_images')
    .select('product_id, url, sort_order')
    .in('product_id', ids)
    .order('sort_order', { ascending: true });

  const firstImageMap = new Map<string, string>();
  for (const row of (imgRows ?? []) as { product_id: string; url: string }[]) {
    if (!firstImageMap.has(row.product_id)) firstImageMap.set(row.product_id, row.url);
  }

  const resolved = products.map(p => ({
    ...p,
    image: firstImageMap.get(p.id as string) ?? p.image ?? null,
  }));

  return NextResponse.json(resolved);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const id = generateId();

  const rawSlug = body.slug || body.name || id;
  let slug = String(rawSlug)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (!slug) slug = id;

  const sb = getServiceSupabase();

  const { data: existing } = await sb
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const row: Record<string, unknown> = {
    id,
    slug,
    name:     body.name,
    category: body.category,
    price:    Number(body.price),
    in_stock: body.in_stock ?? true,
  };

  if (body.subtitle?.trim())      row.subtitle       = body.subtitle.trim();
  if (body.original_price)        row.original_price  = Number(body.original_price);
  if (body.badge?.trim())         row.badge           = body.badge.trim();
  if (body.description?.trim())   row.description     = body.description.trim();
  if (body.subcategory?.trim())   row.subcategory     = body.subcategory.trim();
  if (body.gender?.trim())        row.gender          = body.gender.trim();

  const { data, error } = await sb.from('products').insert([row]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
