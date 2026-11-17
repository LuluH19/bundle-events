import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/src/config";

export interface CurrentUser {
  id: string;
  email: string | null;
}

// Cookie-bound client acting as the signed-in user (anon key). Use for auth only.
export async function getSupabaseSession(): Promise<SupabaseClient | null> {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await getSupabaseSession();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email?.toLowerCase() ?? null };
}
