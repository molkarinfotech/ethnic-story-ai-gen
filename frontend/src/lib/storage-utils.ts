/**
 * Derive the Supabase Storage bucket + path from a public object URL.
 * URLs look like:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
export function storagePathFromUrl(
  url: string
): { bucket: string; storagePath: string } | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(
      /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
    );
    if (!match) return null;
    return { bucket: match[1], storagePath: match[2] };
  } catch {
    return null;
  }
}
