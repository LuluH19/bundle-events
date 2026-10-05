import { getGroupView } from "@/src/lib/groups";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; name?: string; email?: string } | null;
  const token = body?.token?.trim();
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase() || null;
  if (!token || !name) return Response.json({ error: "Le lien et votre nom sont requis." }, { status: 400 });
  if (email && !EMAIL.test(email)) return Response.json({ error: "Adresse email invalide." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: invitation } = await supabase.from("group_invitations")
    .select("id, group_id, email, accepted_at").eq("token", token).maybeSingle();
  if (!invitation || (invitation.email && invitation.accepted_at)) {
    return Response.json({ error: "Cette invitation est invalide ou déjà utilisée." }, { status: 404 });
  }
  const memberEmail = invitation.email || email;
  if (invitation.email && email && invitation.email.toLowerCase() !== email) {
    return Response.json({ error: "Cette invitation est destinée à une autre adresse email." }, { status: 403 });
  }
  if (memberEmail) {
    const { data: existing } = await supabase.from("group_members").select("id")
      .eq("group_id", invitation.group_id).ilike("email", memberEmail).maybeSingle();
    if (existing) return Response.json({ error: "Vous êtes déjà membre de ce groupe." }, { status: 409 });
  }
  const { data: member, error } = await supabase.from("group_members")
    .insert({ group_id: invitation.group_id, name, email: memberEmail, role: "member" })
    .select("access_token").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (invitation.email) {
    await supabase.from("group_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);
  }
  const group = await getGroupView(invitation.group_id, "member");
  if (!group) return Response.json({ error: "Groupe introuvable." }, { status: 404 });
  return Response.json({
    group, session: { groupId: group.id, bundleUuid: group.bundleUuid, accessToken: member.access_token },
  }, { status: 201 });
}
