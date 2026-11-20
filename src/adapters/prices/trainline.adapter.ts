import type { PriceLeg, PriceQuote } from "@/src/types";
import { pricesConfig } from "@/src/config";
import { resolveTrainlineUrn, TRAINLINE_HEADERS } from "@/src/lib/trainline";

type TrainlineMoney = { amount?: number | string; currencyCode?: string };

export type TrainlineSearchResponse = {
  data?: {
    journeySearch?: {
      journeys?: Record<string, { departAt?: string; sections?: string[] }>;
      sections?: Record<string, { alternatives?: string[] }>;
      alternatives?: Record<string, { price?: TrainlineMoney; fullPrice?: TrainlineMoney }>;
    };
  };
};

const toAmount = (m?: TrainlineMoney) => (m?.amount != null && Number.isFinite(Number(m.amount)) ? Number(m.amount) : null);

/**
 * Cheapest priced journey (Trainline « Le moins cher »), preferring offers close
 * to `targetISO` when several share the same fare.
 */
export function parseTrainlineQuote(body: TrainlineSearchResponse, targetISO: string): PriceQuote | null {
  const search = body.data?.journeySearch;
  if (!search?.journeys) return null;
  const target = Date.parse(targetISO);

  const priced = Object.values(search.journeys)
    .map((j) => {
      let total = 0;
      for (const sid of j.sections ?? []) {
        const prices = (search.sections?.[sid]?.alternatives ?? [])
          .map((aid) => search.alternatives?.[aid])
          .map((a) => toAmount(a?.fullPrice) ?? toAmount(a?.price))
          .filter((p): p is number => p != null);
        if (!prices.length) return null;
        total += Math.min(...prices);
      }
      const gap = Number.isFinite(target) && j.departAt ? Math.abs(Date.parse(j.departAt) - target) : 0;
      return j.sections?.length ? { total, gap } : null;
    })
    .filter((j): j is { total: number; gap: number } => j != null)
    // Cheapest first — same ranking as Trainline's « Le moins cher » badge.
    .sort((a, b) => a.total - b.total || a.gap - b.gap);

  const best = priced[0];
  return best ? { amount: Math.round(best.total), source: "live", provider: "Trainline" } : null;
}

export async function trainlineQuote(leg: PriceLeg): Promise<PriceQuote> {
  const [origin, destination] = await Promise.all([
    resolveTrainlineUrn(leg.from.name, leg.from.coords.lat, leg.from.coords.lng),
    resolveTrainlineUrn(leg.to.name, leg.to.coords.lat, leg.to.coords.lng),
  ]);
  if (!origin || !destination) throw new Error("Trainline: station not resolved");

  const res = await fetch("https://www.thetrainline.com/api/journey-search/", {
    method: "POST",
    headers: {
      ...TRAINLINE_HEADERS,
      "Content-Type": "application/json",
      Origin: "https://www.thetrainline.com",
      Referer: "https://www.thetrainline.com/book/results",
    },
    signal: AbortSignal.timeout(pricesConfig.timeoutMs),
    body: JSON.stringify({
      passengers: [{ dateOfBirth: "1995-01-01" }],
      isEurope: true,
      cards: [],
      transitDefinitions: [
        {
          direction: "outward",
          origin,
          destination,
          journeyDate: { type: "departAfter", time: leg.datetime.length === 16 ? `${leg.datetime}:00` : leg.datetime },
        },
      ],
      type: "single",
      maximumJourneys: 10,
      includeRealtime: true,
      transportModes: ["mixed"],
      directSearch: false,
      composition: ["through", "interchangeSplit"],
    }),
  });
  if (!res.ok) throw new Error(`Trainline: HTTP ${res.status}`);

  const quote = parseTrainlineQuote((await res.json()) as TrainlineSearchResponse, leg.datetime);
  if (!quote) throw new Error("Trainline: no priced journey");
  return quote;
}
