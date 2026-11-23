import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { flushPostHogLogs, logBundleCreated } from "@/src/lib/posthog-logs";
import { allowRequest, clientIp, underDailyLimit } from "@/src/lib/rate-limit";
import { bundlesConfig } from "@/src/config";
import { validateBundleData } from "@/src/utils/bundle-validation";
import { readJsonBody } from "@/src/utils/request-body";

const tooMany = () => Response.json({ error: "Too many bundles created, try again later" }, { status: 429 });

export async function POST(request: NextRequest) {
  const { max, windowMs } = bundlesConfig.createPerIp;
  if (!allowRequest(`bundles:create:${clientIp(request)}`, max, windowMs)) return tooMany();

  const read = await readJsonBody(request, bundlesConfig.maxBodyBytes);
  if (!read.ok) return Response.json({ error: read.error }, { status: read.status });

  const valid = validateBundleData((read.body as { data?: unknown } | null)?.data);
  if (!valid.ok) return Response.json({ error: valid.error }, { status: 400 });

  // Counted after validation: rejected requests do not use up the daily total.
  if (!(await underDailyLimit("bundles-create", bundlesConfig.dailyCreateLimit))) return tooMany();

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("bundles")
    .insert({ data: valid.data })
    .select("uuid")
    .single();

  if (error) {
    console.error("[bundles] insert failed:", error.message);
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  logBundleCreated();
  await flushPostHogLogs();

  return Response.json({ uuid: row.uuid }, { status: 201 });
}
