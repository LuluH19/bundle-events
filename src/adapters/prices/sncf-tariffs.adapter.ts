import type { PriceLeg, PriceQuote } from "@/src/types";
import { pricesConfig } from "@/src/config";
import { memoize } from "@/src/lib/memo-cache";
import { nearbySncfStations, uicFromStopArea } from "@/src/lib/sncf-stations";

/** Official SNCF fare grids (2nd class, "Tarif Normal"), one record per origin-destination and carrier. */
const DATASETS = [
  { id: "tarifs-tgv-inoui-ouigo", from: "gare_origine_code_uic", to: "gare_destination_code_uic", min: "prix_minimum", max: "prix_maximum" },
  { id: "tarifs-intercites", from: "origine_uic8", to: "destination_uic8", min: "prix_min", max: "prix_max" },
] as const;

const FARE_FILTER = `classe="2" and profil_tarifaire="Tarif Normal"`;

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

/** UIC8 codes that appear in at least one fare grid (~350 stations). */
async function fetchTariffUics(): Promise<Set<string>> {
  const fields = DATASETS.flatMap((ds) => [ds.from, ds.to].map((field) => ({ id: ds.id, field })));
  const lists = await Promise.all(
    fields.map(async ({ id, field }) => {
      const params = new URLSearchParams({ select: `${field} as uic`, group_by: field, where: FARE_FILTER });
      const res = await fetch(`${pricesConfig.sncfOpenDataUrl}/${id}/exports/json?${params}`, {
        signal: AbortSignal.timeout(pricesConfig.timeoutMs),
      });
      if (!res.ok) throw new Error(`SNCF open data: HTTP ${res.status}`);
      const rows = (await res.json()) as { uic?: string | null }[];
      return rows.map((r) => r.uic).filter((c): c is string => !!c);
    })
  );
  const uics = new Set(lists.flat());
  if (!uics.size) throw new Error("SNCF open data: empty fare grids");
  return uics;
}

/** `null` when the grids cannot be listed: candidates are then left unfiltered. */
const tariffUics = () => memoize("sncf-tariffs|uics", pricesConfig.tariffStationsTtl, fetchTariffUics).catch(() => null);

/**
 * Keep the nearest stations that have a fare in the grids. Without this filter
 * the closest stops near a venue are often RER / TER halts that no grid lists
 * (Stade de France, La Défense, Chamonix) and the main-line station is cut off.
 */
export function pickTariffUics(nearestFirst: string[], priced: Set<string> | null, limit: number): string[] {
  const unique = [...new Set(nearestFirst)];
  return (priced ? unique.filter((c) => priced.has(c)) : unique).slice(0, limit);
}

async function nearbyUics(end: PriceLeg["from"], priced: Promise<Set<string> | null>): Promise<string[]> {
  const [stations, set] = await Promise.all([
    nearbySncfStations(end.coords, pricesConfig.stationRadiusKm, Number.POSITIVE_INFINITY),
    priced,
  ]);
  const uics = stations.map((s) => uicFromStopArea(s.sncfId)).filter((c): c is string => !!c);
  return pickTariffUics(uics, set, pricesConfig.stationCandidates);
}

async function queryDataset(ds: (typeof DATASETS)[number], from: string[], to: string[]) {
  const where =
    `((${ds.from} in (${quoted(from)}) and ${ds.to} in (${quoted(to)})) or ` +
    `(${ds.from} in (${quoted(to)}) and ${ds.to} in (${quoted(from)}))) ` +
    `and ${FARE_FILTER}`;
  const params = new URLSearchParams({ where, limit: "50" });
  const res = await fetch(`${pricesConfig.sncfOpenDataUrl}/${ds.id}/records?${params}`, {
    signal: AbortSignal.timeout(pricesConfig.timeoutMs),
  });
  if (!res.ok) throw new Error(`SNCF open data: HTTP ${res.status}`);
  const data = (await res.json()) as { results?: TariffRecord[] };
  return (data.results ?? []).map((r) => ({ min: r[ds.min], max: r[ds.max] }));
}

export async function sncfTariffQuote(leg: PriceLeg): Promise<PriceQuote> {
  const priced = tariffUics();
  const [from, to] = await Promise.all([nearbyUics(leg.from, priced), nearbyUics(leg.to, priced)]);
  if (!from.length || !to.length) throw new Error("SNCF tariffs: no priced station nearby");

  const records = (await Promise.all(DATASETS.map((ds) => queryDataset(ds, from, to).catch(() => [])))).flat();
  const quote = parseTariffRecords(records);
  if (!quote) throw new Error("SNCF tariffs: no fare for this origin-destination");
  return quote;
}
