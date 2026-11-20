import { pricesConfig } from "@/src/config";

export type FuelPrices = { gazole: number; sp95: number; e10: number };

/** National average pump prices (€/L) from the government's real-time feed. */
export async function fetchFuelPrices(): Promise<FuelPrices> {
  const params = new URLSearchParams({
    select: "avg(gazole_prix) as gazole, avg(sp95_prix) as sp95, avg(e10_prix) as e10",
    limit: "1",
  });
  const res = await fetch(`${pricesConfig.fuelUrl}?${params}`, { signal: AbortSignal.timeout(pricesConfig.timeoutMs) });
  if (!res.ok) throw new Error(`prix-carburants: HTTP ${res.status}`);
  const row = ((await res.json()) as { results?: Partial<FuelPrices>[] }).results?.[0];
  const gazole = Number(row?.gazole);
  const sp95 = Number(row?.sp95);
  const e10 = Number(row?.e10);
  if (![gazole, sp95, e10].every((n) => Number.isFinite(n) && n > 0)) throw new Error("prix-carburants: empty");
  return { gazole, sp95, e10 };
}
