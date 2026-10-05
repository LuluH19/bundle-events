import { authenticateGroupMember, getGroupView } from "@/src/lib/groups";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { splitAmountEvenly } from "@/src/utils/algorithms/split-amount";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const currentMember = await authenticateGroupMember(groupId, request);
  if (!currentMember || currentMember.role !== "organizer") {
    return Response.json({ error: "Seul l’organisateur peut répartir le total." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { totalCents?: number } | null;
  const totalCents = body?.totalCents;
  if (!Number.isSafeInteger(totalCents) || (totalCents as number) < 0) {
    return Response.json({ error: "Le total en centimes est invalide." }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data: members, error: membersError } = await supabase.from("group_members")
    .select("id").eq("group_id", groupId).order("joined_at");
  if (membersError) return Response.json({ error: membersError.message }, { status: 500 });
  if (!members?.length) return Response.json({ error: "Le groupe ne contient aucun membre." }, { status: 409 });
  const shares = splitAmountEvenly(totalCents as number, members.map((member) => member.id));
  const results = await Promise.all(shares.map((share) => supabase.from("group_members")
    .update({ share_cents: share.amountCents }).eq("group_id", groupId).eq("id", share.memberId)));
  const failure = results.find((result) => result.error)?.error;
  if (failure) return Response.json({ error: failure.message }, { status: 500 });
  return Response.json({ group: await getGroupView(groupId, "organizer"), totalCents });
}
