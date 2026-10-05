import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import type { GroupRole, TravelGroup } from "@/src/types";

export async function authenticateGroupMember(groupId: string, request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;
  const { data } = await getSupabaseAdmin().from("group_members").select("id, role")
    .eq("group_id", groupId).eq("access_token", token).maybeSingle();
  return data as { id: string; role: GroupRole } | null;
}

export async function getGroupView(groupId: string, role: GroupRole): Promise<TravelGroup | null> {
  const supabase = getSupabaseAdmin();
  const [{ data: group }, { data: members }, invitationResult] = await Promise.all([
    supabase.from("groups").select("id, bundle_uuid, name").eq("id", groupId).maybeSingle(),
    supabase.from("group_members").select("id, name, email, role, joined_at, share_cents").eq("group_id", groupId).order("joined_at"),
    role === "organizer"
      ? supabase.from("group_invitations").select("email").eq("group_id", groupId).is("accepted_at", null).not("email", "is", null)
      : Promise.resolve({ data: [] as { email: string | null }[] }),
  ]);
  if (!group) return null;
  return {
    id: group.id, bundleUuid: group.bundle_uuid, name: group.name, currentMemberRole: role,
    members: (members || []).map((member) => ({
      id: member.id, name: member.name, email: member.email, role: member.role as GroupRole, joinedAt: member.joined_at,
      shareCents: member.share_cents,
    })),
    pendingInvitations: (invitationResult.data || []).flatMap((invite) => invite.email ? [invite.email] : []),
  };
}
