import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import type { BundleSnapshot } from "@/src/types";

export async function POST(request: NextRequest) {
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
  const { data: row, error } = await supabase
    .from("bundles")
    .insert({ data })
    .select("uuid")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ uuid: row.uuid }, { status: 201 });
}
