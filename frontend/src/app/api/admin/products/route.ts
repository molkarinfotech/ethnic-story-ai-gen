import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';

function generateId(): string {
  // Generates a UUID v4 string that works in both Node and Edge runtimes
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: manual UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('products')
    .select('id, name, slug, category, price, original_price, badge, image, in_stock, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Always supply an id — the products table has a TEXT pk with no default
  const id = (body.id && String(body.id).trim()) || generateId();

  // Ensure slug is URL-safe: lowercase, alphanumeric + hyphens only
  const rawSlug = body.slug || body.name || id;
  let slug = String(rawSlug)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Guard: if slug is empty after sanitising, fall back to the id
  if (!slug) slug = id;

  const sb = getServiceSupabase();

  // Check for slug collision and append a short suffix if needed
  const { data: existing } = await sb
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const row = {
    ...body,
    id,
    slug,
  };

  // Remove any undefined / empty-string optional fields that could upset NOT NULL columns
  for (const key of ['original_price', 'badge', 'image', 'subtitle', 'description']) {
    if (row[key] === '' || row[key] === undefined) delete row[key];
  }

  const { data, error } = await sb
    .from('products')
    .insert([row])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
