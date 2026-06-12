import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// Public route — no auth required, used by storefront
export async function GET() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('in_stock', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
