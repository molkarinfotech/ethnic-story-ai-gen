import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await sb
    .from('product_variants')
    .select('id, size, stock_count')
    .eq('product_id', params.productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalised = (data ?? []).map(v => ({ ...v, stock_count: Number(v.stock_count) }));

  return NextResponse.json(normalised, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
