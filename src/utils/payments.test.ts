import { describe, expect, it } from "vitest";
import type { GroupMemberPayment } from "@/src/types";
import { paymentSummary, setMemberPaymentStatus } from "./payments";

const members: GroupMemberPayment[] = [
  { id: "a", name: "Alice", email: "alice@example.com", amount: 50, status: "unpaid", paidAt: null },
  { id: "b", name: "Bob", email: "bob@example.com", amount: 50, status: "paid", paidAt: "2026-01-01T00:00:00.000Z" },
];

describe("payment tracking", () => {
  it("updates a member immediately after payment", () => {
    const updated = setMemberPaymentStatus(members, "a", true, new Date("2026-02-01T12:00:00.000Z"));
    expect(updated[0]).toMatchObject({ status: "paid", paidAt: "2026-02-01T12:00:00.000Z" });
    expect(updated[1]).toEqual(members[1]);
  });

  it("computes paid and unpaid totals", () => {
    expect(paymentSummary(members)).toEqual({ paidCount: 1, unpaidCount: 1, paidAmount: 50, totalAmount: 100 });
  });
});
