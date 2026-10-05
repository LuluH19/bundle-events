import { describe, expect, it } from "vitest";
import { splitAmountEvenly } from "@/src/utils/algorithms/split-amount";

describe("splitAmountEvenly", () => {
  it("répartit un total divisible à parts égales", () => {
    expect(splitAmountEvenly(12_000, ["a", "b", "c"])).toEqual([
      { memberId: "a", amountCents: 4_000 },
      { memberId: "b", amountCents: 4_000 },
      { memberId: "c", amountCents: 4_000 },
    ]);
  });

  it("distribue les centimes restants sans écart", () => {
    const shares = splitAmountEvenly(10_001, ["a", "b", "c"]);
    expect(shares.map((share) => share.amountCents)).toEqual([3_334, 3_334, 3_333]);
    expect(shares.reduce((sum, share) => sum + share.amountCents, 0)).toBe(10_001);
  });

  it("refuse un groupe vide et un montant non entier", () => {
    expect(() => splitAmountEvenly(100, [])).toThrow();
    expect(() => splitAmountEvenly(10.5, ["a"])).toThrow();
  });
});
