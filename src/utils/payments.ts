import type { GroupMemberPayment } from "@/src/types";

export function setMemberPaymentStatus(
  members: GroupMemberPayment[],
  memberId: string,
  paid: boolean,
  now = new Date()
): GroupMemberPayment[] {
  return members.map((member) =>
    member.id === memberId
      ? { ...member, status: paid ? "paid" : "unpaid", paidAt: paid ? now.toISOString() : null }
      : member
  );
}

export function paymentSummary(members: GroupMemberPayment[]) {
  const paid = members.filter((member) => member.status === "paid");
  return {
    paidCount: paid.length,
    unpaidCount: members.length - paid.length,
    paidAmount: paid.reduce((sum, member) => sum + member.amount, 0),
    totalAmount: members.reduce((sum, member) => sum + member.amount, 0),
  };
}

export function unpaidMembers(members: GroupMemberPayment[]): GroupMemberPayment[] {
  return members.filter((member) => member.status === "unpaid");
}
