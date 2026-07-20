import { NextRequest } from "next/server";
import { emailConfig, sendTestEmail } from "@/src/lib/email";

export async function GET(request: NextRequest) {
  const cfg = emailConfig();
  if (!request.nextUrl.searchParams.get("send")) {
    return Response.json(cfg);
  }
  const test = await sendTestEmail(cfg.from.email);
  return Response.json({ ...cfg, test });
}
