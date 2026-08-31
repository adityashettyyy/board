import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client-side Supabase instance (respects row-level security as the anon role). */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
