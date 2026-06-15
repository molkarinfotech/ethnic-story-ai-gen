import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../../lib/supabase';
import { isAdminAuthed } from '../../../../lib/admin-auth';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function toSlug(str: string): string {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || generateId();
}

export interface ImportRow {
  name: string;
  subtitle?: string;
  category: string;
  price: number;
  original_price?: number;
  badge?: string;
  slug?: string;
  description?: string;
  size: string;
  colour?: string;
  stock: number;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { rows: ImportRow[] };
  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });

  const sb = getServiceSupabase();

  // Group rows by product name
  const productMap = new Map<string, { meta: ImportRow; variants: ImportRow[] }>();
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (!productMap.has(key)) productMap.set(key, { meta: row, variants: [] });
    productMap.get(key)!.variants.push(row);
  }

  let created = 0;
  let updated = 0;
  let variantsUpserted = 0;
  const errors: string[] = [];

  // Use Array.from to avoid --downlevelIteration requirement on Map iteration
  const entries = Array.from(productMap.values());

  for (const { meta, variants } of entries) {
    try {
      const slugBase = toSlug(meta.slug || meta.name);

      // Check if product with this slug already exists
      const { data: existing } = await sb
        .from('products')
        .select('id, slug')
        .eq('slug', slugBase)
        .maybeSingle();

      let productId: string;

      if (existing) {
        // Update existing product details
        productId = existing.id;
        const patch: Record<string, unknown> = {
          name: meta.name.trim(),
          category: meta.category.trim().toLowerCase(),
          price: Number(meta.price),
        };
        if (meta.subtitle)       patch.subtitle       = meta.subtitle.trim();
        if (meta.original_price) patch.original_price = Number(meta.original_price);
        if (meta.badge)          patch.badge          = meta.badge.trim();
        if (meta.description)    patch.description    = meta.description.trim();
        await sb.from('products').update(patch).eq('id', productId);
        updated++;
      } else {
        // Insert new product
        productId = generateId();
        let slug = slugBase;
        const { data: slugCheck } = await sb.from('products').select('id').eq('slug', slug).maybeSingle();
        if (slugCheck) slug = `${slug}-${Date.now().toString(36)}`;

        const row: Record<string, unknown> = {
          id: productId,
          slug,
          name: meta.name.trim(),
          category: meta.category.trim().toLowerCase(),
          price: Number(meta.price),
          in_stock: true,
        };
        if (meta.subtitle)       row.subtitle       = meta.subtitle.trim();
        if (meta.original_price) row.original_price = Number(meta.original_price);
        if (meta.badge)          row.badge          = meta.badge.trim();
        if (meta.description)    row.description    = meta.description.trim();

        const { error: insErr } = await sb.from('products').insert([row]);
        if (insErr) { errors.push(`${meta.name}: ${insErr.message}`); continue; }
        created++;
      }

      // Upsert variants
      for (const v of variants) {
        const size   = String(v.size  || '').trim();
        const colour = String(v.colour || '').trim();
        const stock  = Math.max(0, parseInt(String(v.stock)) || 0);
        if (!size) continue;

        // Check if variant exists
        let query = sb.from('product_variants')
          .select('id')
          .eq('product_id', productId)
          .eq('size', size);
        if (colour) query = query.eq('colour', colour);

        const { data: existingVar } = await query.maybeSingle();

        if (existingVar) {
          await sb.from('product_variants').update({ stock_count: stock }).eq('id', existingVar.id);
        } else {
          const varRow: Record<string, unknown> = {
            id: generateId(),
            product_id: productId,
            size,
            stock_count: stock,
          };
          if (colour) varRow.colour = colour;
          await sb.from('product_variants').insert([varRow]);
        }
        variantsUpserted++;
      }
    } catch (e: unknown) {
      errors.push(`${meta.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    created,
    updated,
    variantsUpserted,
    errors,
    total: productMap.size,
  });
}
