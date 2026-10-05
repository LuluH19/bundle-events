export interface AmountShare {
  memberId: string;
  amountCents: number;
}

/** Split an integer amount without ever losing a cent to rounding. */
export function splitAmountEvenly(totalCents: number, memberIds: string[]): AmountShare[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new Error("Le total doit être un nombre entier positif de centimes.");
  }
  if (memberIds.length === 0) throw new Error("Le groupe doit contenir au moins un membre.");
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents % memberIds.length;
  return memberIds.map((memberId, index) => ({
    memberId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}
