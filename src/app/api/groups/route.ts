import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { getGroupView } from "@/src/lib/groups";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    bundleUuid?: string; groupName?: string; organizerName?: string; organizerEmail?: string;
  } | null;
  const bundleUuid = body?.bundleUuid?.trim();
  const groupName = body?.groupName?.trim();
  const organizerName = body?.organizerName?.trim();
  const organizerEmail = body?.organizerEmail?.trim().toLowerCase() || null;
  if (!bundleUuid || !groupName || !organizerName) {
    return Response.json({ error: "Le bundle, le groupe et l’organisateur sont requis." }, { status: 400 });
  }
  if (organizerEmail && !EMAIL.test(organizerEmail)) {
    return Response.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("groups").select("id").eq("bundle_uuid", bundleUuid).maybeSingle();
  if (existing) return Response.json({ error: "Ce bundle possède déjà un groupe." }, { status: 409 });
  const { data: group, error: groupError } = await supabase.from("groups")
    .insert({ bundle_uuid: bundleUuid, name: groupName }).select("id").single();
  if (groupError) return Response.json({ error: groupError.message }, { status: 500 });
  const { data: organizer, error: memberError } = await supabase.from("group_members")
    .insert({ group_id: group.id, name: organizerName, email: organizerEmail, role: "organizer" })
    .select("access_token").single();
  if (memberError) {
    await supabase.from("groups").delete().eq("id", group.id);
    return Response.json({ error: memberError.message }, { status: 500 });
  }
  return Response.json({
    group: await getGroupView(group.id, "organizer"),
    session: { groupId: group.id, bundleUuid, accessToken: organizer.access_token },
  }, { status: 201 });
}
