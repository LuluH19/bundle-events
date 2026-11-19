import type { PriceLeg, PriceQuote, PriceSource, RouteOption, RouteSegment, TransportMode } from "@/src/types";
import { pricesConfig } from "@/src/config/prices";
import { priceEstimate } from "@/src/utils/travel";

const TICKETED: TransportMode[] = ["plane", "train", "bus"];
const SOURCE_RANK: Record<PriceSource, number> = { live: 0, tariff: 1, estimate: 2 };

export interface MainSpan {
  mode: TransportMode;
  /** Index range `[start, end]` (inclusive) of the segments covered by the ticket. */
  start: number;
  end: number;
  from: RouteSegment["from"];
  to: RouteSegment["to"];
  label?: string;
}

/**
 * Contiguous runs of plane / train / bus (used for transfer counts / diagnostics).
 */
export function ticketedSpans(option: RouteOption): MainSpan[] {
  const segs = option.route.segments;
  const spans: MainSpan[] = [];
  for (let i = 0; i < segs.length; ) {
    const mode = segs[i].mode;
    if (!TICKETED.includes(mode)) {
      i++;
      continue;
    }
    let end = i;
    while (end + 1 < segs.length && segs[end + 1].mode === mode) end++;
    const run = segs.slice(i, end + 1);
    const longest = run.reduce((a, b) => (b.distanceKm > a.distanceKm ? b : a));
    spans.push({ mode, start: i, end, from: segs[i].from, to: segs[end].to, label: longest.label });
    i = end + 1;
  }
  return spans;
}

/**
 * Whether a segment is sold as a long-distance ticket on Trainline/FlixBus.
 * Pure train/bus options always qualify; on a plane trip we skip short airport
 * shuttles (e.g. Orly → Paris ~25 km) that open empty Trainline searches.
 */
export function isLongDistanceTicket(option: RouteOption, mode: TransportMode, seg: RouteSegment): boolean {
  if (mode === "plane") return true;
  if (option.mode === mode) return true;
  const minKm = mode === "train" ? pricesConfig.minBookableTrainKm : mode === "bus" ? pricesConfig.minBookableBusKm : 0;
  return seg.distanceKm >= minKm;
}

/**
 * Same OD as each « Réserver sur … » button: the longest segment per ticketed
 * mode that is actually bookable (see `getBookingLinks`).
 */
export function bookableSpans(option: RouteOption): MainSpan[] {
  const segs = option.route.segments;
  const spans: MainSpan[] = [];
  for (const mode of TICKETED) {
    let best = -1;
    segs.forEach((s, i) => {
      if (s.mode !== mode || !isLongDistanceTicket(option, mode, s)) return;
      if (best < 0 || s.distanceKm > segs[best].distanceKm) best = i;
    });
    if (best < 0) continue;
    const s = segs[best];
    spans.push({ mode, start: best, end: best, from: s.from, to: s.to, label: s.label });
  }
  return spans;
}

/**
 * Stretch of the option sold as one ticket for the option's main mode.
 */
export function mainSpan(option: RouteOption): MainSpan | null {
  const spans = bookableSpans(option);
  return spans.find((s) => s.mode === option.mode) ?? spans[0] ?? null;
}

export function carCost(km: number, fuelPricePerLitre: number): number {
  const fuel = (km * pricesConfig.carConsumptionL100 * fuelPricePerLitre) / 100;
  const tolls = Math.max(0, km - pricesConfig.tollFreeKm) * pricesConfig.tollPerKm;
  return fuel + tolls;
}

function segmentCost(seg: RouteSegment, fuelPricePerLitre: number): number {
  if (seg.mode === "walking") return 0;
  if (seg.mode === "car") return carCost(seg.distanceKm, fuelPricePerLitre);
  return priceEstimate(seg.mode, seg.distanceKm);
}

function spanEstimate(option: RouteOption, span: MainSpan): PriceQuote {
  const km = option.route.segments.slice(span.start, span.end + 1).reduce((sum, s) => sum + s.distanceKm, 0);
  return { amount: priceEstimate(span.mode, km), source: "estimate" };
}

function mergeProviders(quotes: PriceQuote[]): string | undefined {
  const names = [...new Set(quotes.map((q) => q.provider).filter((p): p is string => !!p))];
  return names.length ? names.join(" + ") : undefined;
}

/**
 * Price of a whole option: one fare per bookable span (aligned with booking
 * buttons) plus car/walk access. Secondary train/bus hops that are not the
 * deep-linked leg are omitted so the total matches what Trainline/Kayak sell.
 */
export function combineQuotes(
  option: RouteOption,
  spanQuotes: Array<PriceQuote | null> | PriceQuote | null,
  fuelPricePerLitre: number
): PriceQuote {
  const segs = option.route.segments;
  const spans = bookableSpans(option);
  const quotes = Array.isArray(spanQuotes) ? spanQuotes : [spanQuotes];

  if (!spans.length) {
    const total = segs.reduce((sum, s) => sum + segmentCost(s, fuelPricePerLitre), 0);
    if (option.mode === "walking") return { amount: 0, source: "live" };
    return { amount: Math.round(total), source: "estimate", provider: "carburant + péages" };
  }

  const covered = new Set<number>();
  const resolved: PriceQuote[] = [];
  let amount = 0;
  let maxSum = 0;
  let hasMax = false;
  let worst: PriceSource = "live";

  spans.forEach((span, i) => {
    for (let j = span.start; j <= span.end; j++) covered.add(j);
    const q = quotes[i] ?? spanEstimate(option, span);
    resolved.push(q);
    amount += q.amount;
    if (q.max != null) {
      hasMax = true;
      maxSum += q.max;
    } else {
      maxSum += q.amount;
    }
    if (SOURCE_RANK[q.source] > SOURCE_RANK[worst]) worst = q.source;
  });

  // Only road access inflates the ticketed total — local feeder trains/buses
  // are not on the Trainline/Kayak deep-link and must not distort that price.
  const extras = Math.round(
    segs.reduce((sum, s, i) => {
      if (covered.has(i)) return sum;
      if (s.mode === "car") return sum + carCost(s.distanceKm, fuelPricePerLitre);
      return sum;
    }, 0)
  );

  return {
    amount: Math.round(amount + extras),
    max: hasMax ? Math.round(maxSum + extras) : undefined,
    source: worst,
    provider: mergeProviders(resolved),
    extras: extras || undefined,
  };
}

export function withQuote(option: RouteOption, quote: PriceQuote, modeQuotes?: RouteOption["modeQuotes"]): RouteOption {
  return { ...option, price: quote.amount, quote, modeQuotes };
}

/** One fare per bookable mode (sums multiple quoted spans of the same mode). */
export function aggregateModeQuotes(
  option: RouteOption,
  spanQuotes: Array<PriceQuote | null>
): NonNullable<RouteOption["modeQuotes"]> {
  const spans = bookableSpans(option);
  const byMode: NonNullable<RouteOption["modeQuotes"]> = {};
  spans.forEach((span, i) => {
    if (span.mode !== "plane" && span.mode !== "train" && span.mode !== "bus") return;
    const q = spanQuotes[i] ?? spanEstimate(option, span);
    const prev = byMode[span.mode];
    if (!prev) {
      byMode[span.mode] = { ...q };
      return;
    }
    byMode[span.mode] = {
      amount: prev.amount + q.amount,
      max: prev.max != null || q.max != null ? (prev.max ?? prev.amount) + (q.max ?? q.amount) : undefined,
      source: SOURCE_RANK[q.source] > SOURCE_RANK[prev.source] ? q.source : prev.source,
      provider: mergeProviders([prev, q]),
    };
  });
  return byMode;
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Departure time of the ticketed span. For an "arrive by" search we step back
 * by the option's duration so the provider is asked for the right train/bus.
 */
export function spanDepartureTime(iso: string, represents: "departure" | "arrival", durationMin: number): string {
  const base = iso.slice(0, 16);
  if (represents === "departure") return base;
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return base;
  d.setMinutes(d.getMinutes() - Math.round(durationMin));
  return formatLocal(d);
}

/** Departure time of a specific span, shifted by the duration of segments before it. */
export function spanDepartureAt(
  option: RouteOption,
  span: MainSpan,
  search: { iso: string; represents: "departure" | "arrival" }
): string {
  const base = spanDepartureTime(search.iso, search.represents, option.durationMin);
  if (search.represents === "arrival" || span.start === 0) return base;
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return base;
  const before = option.route.segments.slice(0, span.start).reduce((sum, s) => sum + s.durationMinutes, 0);
  d.setMinutes(d.getMinutes() + Math.round(before));
  return formatLocal(d);
}

export function spanLeg(span: MainSpan, datetime: string): PriceLeg {
  return { from: span.from, to: span.to, datetime };
}
