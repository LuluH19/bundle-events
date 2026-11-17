import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { getCurrentUser } from "@/src/lib/supabase/session";
import type { BundleSummary } from "@/src/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filters = [`user_id.eq.${user.id}`];
  if (user.email) filters.push(`email.eq."${user.email}"`);

  const { data, error } = await getSupabaseAdmin()
    .from("bundles")
    .select("uuid, data, created_at, updated_at")
    .or(filters.join(","))
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ bundles: (data ?? []) as BundleSummary[] });
}
