import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Bypasses RLS entirely — only ever import
 * this from server-only code (Server Actions / Route Handlers), never from
 * a Client Component, and never send its key to the browser.
 *
 * Used for staff account management (creating an auth user for a new
 * staff login requires the Admin API, which requires the service role key).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
