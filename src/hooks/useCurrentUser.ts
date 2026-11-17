"use client";

import { useEffect, useState } from "react";
import { supabaseConfig } from "@/src/config";
import { getSupabaseBrowser } from "@/src/lib/supabase/browser";

export interface SessionUser {
  id: string;
  email: string | null;
}

const authEnabled = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

// `undefined` while loading, `null` when signed out.
export function useCurrentUser(): SessionUser | null | undefined {
  const [user, setUser] = useState<SessionUser | null | undefined>(authEnabled ? undefined : null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const toUser = (u: { id: string; email?: string } | null | undefined) =>
      u ? { id: u.id, email: u.email ?? null } : null;

    supabase.auth.getUser().then(({ data }) => setUser(toUser(data.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(toUser(session?.user)));
    return () => sub.subscription.unsubscribe();
  }, []);

  return user;
}
