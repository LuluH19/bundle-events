import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/src/config";

let client: SupabaseClient | null = null;

// Browser client (anon key) — only used for Supabase Auth, never to read the bundles table.
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) return null;
  if (!client) client = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
  return client;
}
