import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import type { BundleSnapshot } from "@/src/types";

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { uuid } = await params;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bundles")
    .select("uuid, email, data, created_at, updated_at")
    .eq("uuid", uuid)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Bundle not found" }, { status: 404 });
  }

  return Response.json(data);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { uuid } = await params;

  let body: { data?: Partial<BundleSnapshot> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body?.data;
  if (!data || typeof data !== "object") {
    return Response.json({ error: "data is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("bundles").update({ data }).eq("uuid", uuid);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
