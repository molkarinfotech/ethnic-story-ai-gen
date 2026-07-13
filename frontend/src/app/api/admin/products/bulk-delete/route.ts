import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../../lib/supabase';
import { storagePathFromUrl } from '../../../../../lib/storage-utils';

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

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { ids } = body as { ids?: string[] };

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });

  const sb = getServiceSupabase();

  // 1. Fetch all image URLs before deleting (cascade will remove the rows)
  const { data: imageRows } = await sb
    .from('product_images')
    .select('url')
    .in('product_id', ids);

  // 2. Delete all products (cascades to product_variants + product_images)
  const { error } = await sb.from('products').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. Clean up storage files grouped by bucket (best-effort)
  if (imageRows && imageRows.length > 0) {
    const byBucket: Record<string, string[]> = {};
    for (const row of imageRows) {
      const loc = storagePathFromUrl(row.url);
      if (loc) {
        if (!byBucket[loc.bucket]) byBucket[loc.bucket] = [];
        byBucket[loc.bucket].push(loc.storagePath);
      }
    }
    for (const [bucket, paths] of Object.entries(byBucket)) {
      const { error: storageErr } = await sb.storage.from(bucket).remove(paths);
      if (storageErr) {
        console.warn(`[bulk-delete] storage error for "${bucket}":`, storageErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true, deleted: ids.length });
}
