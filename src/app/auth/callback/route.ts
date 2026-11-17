import { NextRequest, NextResponse } from "next/server";
import { getSupabaseSession } from "@/src/lib/supabase/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const home = new URL("/", request.nextUrl.origin);

  if (code) {
    const supabase = await getSupabaseSession();
    const { error } = supabase ? await supabase.auth.exchangeCodeForSession(code) : { error: true };
    if (error) home.searchParams.set("auth", "error");
    else home.hash = "mes-bundles";
  }

  return NextResponse.redirect(home);
}
