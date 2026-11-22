import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { bundlesConfig } from "@/src/config";
import { validateBundleData } from "@/src/utils/bundle-validation";
import { readJsonBody } from "@/src/utils/request-body";
import { isUuid } from "@/src/utils/uuid";

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { uuid } = await params;
  if (!isUuid(uuid)) {
    return Response.json({ error: "Bundle not found" }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bundles")
    .select("uuid, data, created_at, updated_at")
    .eq("uuid", uuid)
    .maybeSingle();

  if (error) {
    console.error("[bundles] read failed:", error.message);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Bundle not found" }, { status: 404 });
  }

  return Response.json(data);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { uuid } = await params;
  if (!isUuid(uuid)) {
    return Response.json({ error: "Bundle not found" }, { status: 404 });
  }

  const read = await readJsonBody(request, bundlesConfig.maxBodyBytes);
  if (!read.ok) return Response.json({ error: read.error }, { status: read.status });

  const valid = validateBundleData((read.body as { data?: unknown } | null)?.data);
  if (!valid.ok) return Response.json({ error: valid.error }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from("bundles")
    .update({ data: valid.data })
    .eq("uuid", uuid)
    .select("uuid");

  if (error) {
    console.error("[bundles] update failed:", error.message);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
  if (!updated?.length) {
    return Response.json({ error: "Bundle not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
