import type { PriceLeg, PriceQuote } from "@/src/types";
import { pricesConfig } from "@/src/config";
import { FLIXBUS_HEADERS, resolveFlixbusCityId, toFlixDate } from "@/src/lib/flixbus";

export type FlixbusSearchResponse = {
  trips?: {
    results?: Record<string, { status?: string; departure?: { date?: string }; price?: { total?: number; total_with_platform_fee?: number } }>;
  }[];
};

/** Price (platform fee included, as shown at checkout) of the available ride leaving closest to `targetISO`. */
export function parseFlixbusQuote(body: FlixbusSearchResponse, targetISO: string): PriceQuote | null {
  const target = Date.parse(targetISO);
  const rides = (body.trips ?? [])
    .flatMap((t) => Object.values(t.results ?? {}))
    .filter((r) => r.status === "available")
    .map((r) => ({
      price: r.price?.total_with_platform_fee ?? r.price?.total,
      gap: Number.isFinite(target) && r.departure?.date ? Math.abs(Date.parse(r.departure.date) - target) : 0,
    }))
    .filter((r): r is { price: number; gap: number } => typeof r.price === "number" && r.price > 0)
    .sort((a, b) => a.gap - b.gap || a.price - b.price);

  const best = rides[0];
  return best ? { amount: Math.round(best.price), source: "live", provider: "FlixBus" } : null;
}

export async function flixbusQuote(leg: PriceLeg): Promise<PriceQuote> {
  const [fromCity, toCity] = await Promise.all([
    resolveFlixbusCityId(leg.from.name, leg.from.coords.lat, leg.from.coords.lng),
    resolveFlixbusCityId(leg.to.name, leg.to.coords.lat, leg.to.coords.lng),
  ]);
  if (!fromCity || !toCity || fromCity === toCity) throw new Error("FlixBus: city not resolved");

  const params = new URLSearchParams({
    from_city_id: fromCity,
    to_city_id: toCity,
    departure_date: toFlixDate(leg.datetime),
    products: JSON.stringify({ adult: 1 }),
    currency: "EUR",
    locale: "fr",
    search_by: "cities",
    include_after_midnight_rides: "1",
  });
  const res = await fetch(`https://global.api.flixbus.com/search/service/v4/search?${params}`, {
    headers: FLIXBUS_HEADERS,
    signal: AbortSignal.timeout(pricesConfig.timeoutMs),
  });
  if (!res.ok) throw new Error(`FlixBus: HTTP ${res.status}`);

  const quote = parseFlixbusQuote((await res.json()) as FlixbusSearchResponse, leg.datetime);
  if (!quote) throw new Error("FlixBus: no available ride");
  return quote;
}
