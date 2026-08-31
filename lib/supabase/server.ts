import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key. Only import this
 * from Route Handlers / server components — never from client components.
 */
export function supabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
