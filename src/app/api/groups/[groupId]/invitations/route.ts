import { supabaseConfig } from "@/src/config";
import { authenticateGroupMember, getGroupView } from "@/src/lib/groups";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { sendGroupInvitationEmail } from "@/src/lib/email";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const member = await authenticateGroupMember(groupId, request);
  if (!member || member.role !== "organizer") {
    return Response.json({ error: "Seul l’organisateur peut inviter des membres." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as { email?: string };
  const email = body.email?.trim().toLowerCase() || null;
  if (email && !EMAIL.test(email)) return Response.json({ error: "Adresse email invalide." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  let duplicate = false;
  let invitation: { token: string } | null = null;
  if (email) {
    const { data: existingMember } = await supabase.from("group_members").select("id")
      .eq("group_id", groupId).ilike("email", email).maybeSingle();
    if (existingMember) return Response.json({ error: "Cette personne est déjà membre du groupe." }, { status: 409 });
    const { data: existingInvite } = await supabase.from("group_invitations").select("token")
      .eq("group_id", groupId).ilike("email", email).is("accepted_at", null).maybeSingle();
    if (existingInvite) { invitation = existingInvite; duplicate = true; }
  }
  if (!invitation) {
    const { data, error } = await supabase.from("group_invitations").insert({ group_id: groupId, email }).select("token").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    invitation = data;
  }
  const link = `${supabaseConfig.siteUrl.replace(/\/$/, "")}/groups/join/${invitation.token}`;
  let sent = false;
  if (email && !duplicate) {
    const group = await getGroupView(groupId, "organizer");
    sent = await sendGroupInvitationEmail(email, group?.name || "votre groupe", link);
  }
  return Response.json({ link, duplicate, sent }, { status: duplicate ? 200 : 201 });
}
