import { authenticateGroupMember, getGroupView } from "@/src/lib/groups";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const member = await authenticateGroupMember(groupId, request);
  if (!member) return Response.json({ error: "Accès au groupe refusé." }, { status: 401 });
  const group = await getGroupView(groupId, member.role);
  if (!group) return Response.json({ error: "Groupe introuvable." }, { status: 404 });
  return Response.json({ group });
}
