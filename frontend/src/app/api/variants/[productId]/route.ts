import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HIDDEN_SIZES = ['__colour__', 'TBA'];

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('product_variants')
    .select('id, size, colour, stock_count')
    .eq('product_id', params.productId)
    // Exclude all sentinel/placeholder rows
    .not('size', 'in', `(${HIDDEN_SIZES.map(s => `"${s}"`).join(',')})`)
    .order('colour')
    // Do NOT rely on DB-level size sort (lexicographic is wrong for mixed types);
    // sorting is done client-side in SizeSelector.sortSizes()
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalised = (data ?? []).map(v => ({
    ...v,
    // Normalise colour: trim + title-case so slight differences never split a group
    colour: (v.colour ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase()),
    stock_count: Number(v.stock_count),
  }));

  return NextResponse.json(normalised, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  });
}
