import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('products')
    .select('*, images')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
