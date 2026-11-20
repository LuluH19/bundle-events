import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { sendBundleLinkEmail } from "@/src/lib/email";
import { flushPostHogLogs, logBundleLinkEmailRequested } from "@/src/lib/posthog-logs";
import { isUuid } from "@/src/utils/uuid";

type Ctx = { params: Promise<{ uuid: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest, { params }: Ctx) {
  const { uuid } = await params;
  if (!isUuid(uuid)) {
    return Response.json({ error: "Bundle not found" }, { status: 404 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (typeof body?.email === "string" ? body.email : "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return Response.json({ error: "Adresse email invalide" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: findError } = await supabase
    .from("bundles")
    .select("uuid")
    .eq("uuid", uuid)
    .maybeSingle();

  if (findError) {
    console.error("[bundles] read failed:", findError.message);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
  if (!existing) {
    return Response.json({ error: "Bundle not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("bundles")
    .update({ email })
    .eq("uuid", uuid);

  if (updateError) {
    console.error("[bundles] email update failed:", updateError.message);
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  const { link, sent } = await sendBundleLinkEmail(email, uuid);

  logBundleLinkEmailRequested(sent);
  await flushPostHogLogs();

  return Response.json({ ok: true, link, sent });
}
