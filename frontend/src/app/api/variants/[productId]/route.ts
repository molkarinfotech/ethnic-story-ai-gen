import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_variants')
    .select('id, size, colour, stock_count')
    .eq('product_id', params.productId)
    // Exclude sentinel/placeholder rows that may have been created by import scripts
    .neq('size', '__colour__')
    .order('colour')
    .order('size');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalised = (data ?? []).map(v => ({
    ...v,
    colour: v.colour ?? '',
    stock_count: Number(v.stock_count),
  }));

  return NextResponse.json(normalised, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
