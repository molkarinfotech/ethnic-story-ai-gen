import { createClient } from '@supabase/supabase-js';

// Vercel-Supabase integration may use SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing env vars. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Check Vercel → Settings → Environment Variables.'
  );
}

// Public client — used on the storefront for reading products
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Service role client — server-side only, used in API routes
export function getServiceSupabase() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    '';
  return createClient(supabaseUrl || 'https://placeholder.supabase.co', serviceKey || 'placeholder', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
