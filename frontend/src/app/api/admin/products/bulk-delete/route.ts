import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../../lib/supabase';

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

function storagePathFromUrl(url: string): { bucket: string; storagePath: string } | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], storagePath: match[2] };
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let ids: string[];
  try {
    const body = await req.json();
    ids = body.ids;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // 1. Fetch all image URLs before deleting so we can clean up storage
  const { data: imageRows } = await sb
    .from('product_images')
    .select('url')
    .in('product_id', ids);

  // 2. Delete all products (DB cascade removes product_variants + product_images rows)
  const { error: deleteError } = await sb
    .from('products')
    .delete()
    .in('id', ids);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 3. Delete storage files grouped by bucket (best-effort — don't fail the response)
  if (imageRows && imageRows.length > 0) {
    const byBucket: Record<string, string[]> = {};
    for (const row of imageRows) {
      if (!row.url) continue;
      const loc = storagePathFromUrl(row.url);
      if (loc) {
        if (!byBucket[loc.bucket]) byBucket[loc.bucket] = [];
        byBucket[loc.bucket].push(loc.storagePath);
      }
    }
    for (const [bucket, paths] of Object.entries(byBucket)) {
      const { error: storageErr } = await sb.storage.from(bucket).remove(paths);
      if (storageErr) {
        console.warn(`[bulk-delete] storage removal failed for bucket "${bucket}":`, storageErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true, deleted: ids.length });
}
