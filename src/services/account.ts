import type { BundleSummary } from "@/src/types";
import { getSupabaseBrowser } from "@/src/lib/supabase/browser";

// Bundles linked to the signed-in user. Returns null when not signed in.
export async function fetchMyBundles(): Promise<BundleSummary[] | null> {
  const res = await fetch("/api/me/bundles", { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`fetchMyBundles failed: ${res.status}`);
  const json = (await res.json()) as { bundles: BundleSummary[] };
  return json.bundles;
}

// Send a magic link; the user is signed in when opening it (via /auth/callback).
export async function signInWithEmail(email: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("La connexion n'est pas disponible pour le moment.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}
