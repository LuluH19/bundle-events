import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { sendPaymentReminderEmail } from "@/src/lib/email";
import { unpaidMembers } from "@/src/utils/payments";
import type { BundleSnapshot } from "@/src/types";

type Ctx = { params: Promise<{ uuid: string }> };

export async function POST(_request: NextRequest, { params }: Ctx) {
  const { uuid } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("bundles").select("data").eq("uuid", uuid).maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Bundle not found" }, { status: 404 });

  const snapshot = data.data as Partial<BundleSnapshot> | null;
  const targets = unpaidMembers(snapshot?.payments ?? []);
  const results = await Promise.all(
    targets.map(async (member) => ({
      memberId: member.id,
      sent: await sendPaymentReminderEmail(member.email, member.name, member.amount, uuid),
    }))
  );

  return Response.json({
    ok: true,
    targeted: targets.length,
    sent: results.filter((result) => result.sent).length,
    deliveryConfigured: Boolean(process.env.BREVO_API_KEY),
  });
}
