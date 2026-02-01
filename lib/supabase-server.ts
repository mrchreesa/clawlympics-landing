import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with service role privileges.
 * ONLY use in API routes / server components.
 * NEVER import this in client-side code.
 */

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - check .env.local');
  }

  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  return _supabaseAdmin;
}

// Convenience export - lazy initialized
export const supabaseAdmin = {
  from: (table: string) => getSupabaseAdmin().from(table),
};
