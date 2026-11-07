import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isConfigured = Boolean(
  url && key && url.startsWith('https://') &&
  !url.includes('your-project') && !key.includes('replace_me'),
);

// Never place Supabase service_role / secret keys in a VITE_ variable.
// The publishable (or legacy anon) key is intended for browser clients.
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
