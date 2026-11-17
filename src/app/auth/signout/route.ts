import { NextRequest, NextResponse } from "next/server";
import { getSupabaseSession } from "@/src/lib/supabase/session";

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseSession();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
