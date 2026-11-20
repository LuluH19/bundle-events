import type { FlightInfo, PriceLeg, PriceQuote, RouteOption } from "@/src/types";
import { airports } from "@/src/utils/constants/airports";
import { findNearest } from "@/src/utils/travel";
import { dateOnly } from "@/src/utils/date";
import { priceLegKey, priceLegParams } from "@/src/utils/price-leg";
import {
  aggregateModeQuotes,
  combineQuotes,
  spanDepartureAt,
  spanLeg,
  bookableSpans,
  withQuote,
  type MainSpan,
} from "@/src/utils/algorithms/price";
import { pricesConfig } from "@/src/config/prices";

/** Operators whose fares we cannot fetch: their leg keeps the local estimate. */
const UNPRICED_BUS_OPERATORS = new Set(["BlaBlaCar Bus"]);

const inflight = new Map<string, Promise<PriceQuote | null>>();
let fuelPrice: Promise<number> | null = null;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

function fetchFuelPrice(): Promise<number> {
  fuelPrice ??= getJson<{ pricePerLitre?: number }>("/api/prices/fuel").then((d) => {
    if (!d?.pricePerLitre) fuelPrice = null;
    return d?.pricePerLitre ?? pricesConfig.fallbackFuelPrice;
  });
  return fuelPrice;
}

async function flightQuote(leg: PriceLeg): Promise<PriceQuote | null> {
  const dep = findNearest(leg.from.coords, airports);
  const arr = findNearest(leg.to.coords, airports);
  if (dep.id === arr.id) return null;
  const params = new URLSearchParams({ origin: dep.iataCode, destination: arr.iataCode, departure_at: dateOnly(leg.datetime) });
  const data = await getJson<{ flights?: FlightInfo[] }>(`/api/flights/search?${params}`);
  const prices = (data?.flights ?? []).map((f) => f.price).filter((p) => typeof p === "number" && p > 0);
  return prices.length ? { amount: Math.round(Math.min(...prices)), source: "live", provider: "Aviasales" } : null;
}

async function apiQuote(path: "train" | "bus", leg: PriceLeg): Promise<PriceQuote | null> {
  const data = await getJson<{ quote?: PriceQuote | null }>(`/api/prices/${path}?${priceLegParams(leg)}`);
  return data?.quote ?? null;
}

function quoteSpan(span: MainSpan, leg: PriceLeg): Promise<PriceQuote | null> {
  if (span.mode === "bus" && span.label && UNPRICED_BUS_OPERATORS.has(span.label)) return Promise.resolve(null);
  const key = `${span.mode}|${priceLegKey(leg)}`;
  let pending = inflight.get(key);
  if (!pending) {
    pending = span.mode === "plane" ? flightQuote(leg) : apiQuote(span.mode === "train" ? "train" : "bus", leg);
    pending.then((q) => {
      if (!q) inflight.delete(key);
    });
    inflight.set(key, pending);
  }
  return pending;
}

/**
 * Replace the distance-based estimate of an option with the price sold for
 * this date: one provider fare per ticketed span (plane / train / bus) plus
 * estimated access costs. Identical spans across options share a single request.
 */
export async function quoteOption(
  option: RouteOption,
  search: { iso: string; represents: "departure" | "arrival" }
): Promise<RouteOption> {
  const spans = bookableSpans(option);
  const [spanQuotes, fuel] = await Promise.all([
    Promise.all(spans.map((span) => quoteSpan(span, spanLeg(span, spanDepartureAt(option, span, search))))),
    fetchFuelPrice(),
  ]);
  return withQuote(option, combineQuotes(option, spanQuotes, fuel), aggregateModeQuotes(option, spanQuotes));
}

export function quoteOptions(options: RouteOption[], search: { iso: string; represents: "departure" | "arrival" }) {
  return Promise.all(options.map((o) => quoteOption(o, search)));
}
