import type { PriceLeg, PriceQuote } from "@/src/types";
import { pricesConfig } from "@/src/config";
import { nearbySncfStations, uicFromStopArea } from "@/src/lib/sncf-stations";

/** Official SNCF fare grids (2nd class, "Tarif Normal"), one record per origin-destination and carrier. */
const DATASETS = [
  { id: "tarifs-tgv-inoui-ouigo", from: "gare_origine_code_uic", to: "gare_destination_code_uic", min: "prix_minimum", max: "prix_maximum" },
  { id: "tarifs-intercites", from: "origine_uic8", to: "destination_uic8", min: "prix_min", max: "prix_max" },
] as const;

type TariffRecord = Record<string, string | number | null | undefined>;

export function parseTariffRecords(records: { min: unknown; max: unknown }[]): PriceQuote | null {
  const mins = records.map((r) => Number(r.min)).filter((n) => Number.isFinite(n) && n > 0);
  const maxs = records.map((r) => Number(r.max)).filter((n) => Number.isFinite(n) && n > 0);
  if (!mins.length) return null;
  const amount = Math.round(Math.min(...mins));
  const max = maxs.length ? Math.round(Math.max(...maxs)) : undefined;
  return { amount, max: max && max > amount ? max : undefined, source: "tariff", provider: "SNCF" };
}

const quoted = (codes: string[]) => codes.map((c) => `"${c}"`).join(",");

async function nearbyUics(leg: PriceLeg["from"]): Promise<string[]> {
  const stations = await nearbySncfStations(leg.coords, pricesConfig.stationRadiusKm, pricesConfig.stationCandidates);
  return [...new Set(stations.map((s) => uicFromStopArea(s.sncfId)).filter((c): c is string => !!c))];
}

async function queryDataset(ds: (typeof DATASETS)[number], from: string[], to: string[]) {
  const where =
    `((${ds.from} in (${quoted(from)}) and ${ds.to} in (${quoted(to)})) or ` +
    `(${ds.from} in (${quoted(to)}) and ${ds.to} in (${quoted(from)}))) ` +
    `and classe="2" and profil_tarifaire="Tarif Normal"`;
  const params = new URLSearchParams({ where, limit: "50" });
  const res = await fetch(`${pricesConfig.sncfOpenDataUrl}/${ds.id}/records?${params}`, {
    signal: AbortSignal.timeout(pricesConfig.timeoutMs),
  });
  if (!res.ok) throw new Error(`SNCF open data: HTTP ${res.status}`);
  const data = (await res.json()) as { results?: TariffRecord[] };
  return (data.results ?? []).map((r) => ({ min: r[ds.min], max: r[ds.max] }));
}

export async function sncfTariffQuote(leg: PriceLeg): Promise<PriceQuote> {
  const [from, to] = await Promise.all([nearbyUics(leg.from), nearbyUics(leg.to)]);
  if (!from.length || !to.length) throw new Error("SNCF tariffs: no station nearby");

  const records = (await Promise.all(DATASETS.map((ds) => queryDataset(ds, from, to).catch(() => [])))).flat();
  const quote = parseTariffRecords(records);
  if (!quote) throw new Error("SNCF tariffs: no fare for this origin-destination");
  return quote;
}
