import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const DEFAULT_STOCK = 10;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getAdmin();

  // Get all product IDs
  const { data: products, error: pErr } = await sb.from('products').select('id, name');
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const rows = (products ?? []).flatMap(p =>
    DEFAULT_SIZES.map(size => ({ product_id: p.id, size, stock_count: DEFAULT_STOCK }))
  );

  // Upsert — skips sizes that already exist, only inserts missing ones
  const { error: uErr } = await sb
    .from('product_variants')
    .upsert(rows, { onConflict: 'product_id,size', ignoreDuplicates: true });

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    seeded: rows.length,
    products: products?.length ?? 0,
    message: `Seeded up to ${rows.length} size variants across ${products?.length} products (existing stock untouched)`,
  });
}
