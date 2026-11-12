import type { HotelMapItem, LatLng, RouteOption, TripPreference } from "@/src/types";
import { CO2_GRAMS_PER_KM } from "@/src/utils/constants/transport";
import { haversineDistance } from "./geodesic";

export const WALKABLE_HOTEL_KM = 1.6;
export const NEARBY_HOTEL_KM = 5;

export function optionCo2Kg(option: RouteOption): number {
  const grams = option.route.segments.reduce(
    (sum, seg) => sum + seg.distanceKm * CO2_GRAMS_PER_KM[seg.mode],
    0
  );
  return grams / 1000;
}

function minBy<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const item of items) {
    const s = score(item);
    if (s < bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}

export function pickOption(options: RouteOption[], preference: TripPreference): RouteOption | null {
  if (!options.length) return null;
  if (preference === "cheap") return minBy(options, (o) => o.price * 1000 + o.durationMin);
  if (preference === "green") return minBy(options, (o) => optionCo2Kg(o) * 1000 + o.durationMin);
  return minBy(options, (o) => o.durationMin * 1000 + o.price);
}

export function optionBadges(options: RouteOption[]): Record<string, TripPreference[]> {
  const badges: Record<string, TripPreference[]> = {};
  (["fast", "cheap", "green"] as TripPreference[]).forEach((pref) => {
    const best = pickOption(options, pref);
    if (best) badges[best.id] = [...(badges[best.id] ?? []), pref];
  });
  return badges;
}

function hotelScore(h: HotelMapItem): number {
  return h.rating ?? (h.stars ? h.stars * 2 : 0);
}

export function pickHotel(
  hotels: HotelMapItem[],
  venue: LatLng | null,
  preference: TripPreference
): HotelMapItem | null {
  const priced = hotels.filter((h) => h.pricePerNight != null);
  const pool = priced.length ? priced : hotels;
  if (!pool.length) return null;
  const dist = (h: HotelMapItem) => (venue ? haversineDistance(h.coords, venue) : 0);
  const walkable = pool.filter((h) => dist(h) <= WALKABLE_HOTEL_KM);
  const nearby = pool.filter((h) => dist(h) <= NEARBY_HOTEL_KM);
  const candidates = walkable.length ? walkable : nearby.length ? nearby : pool;

  if (preference === "cheap") {
    return minBy(candidates, (h) => (h.pricePerNight ?? Infinity) * 1000 + dist(h));
  }
  if (preference === "green") {
    return minBy(candidates, (h) => dist(h) * 1000 - hotelScore(h));
  }
  return minBy(candidates, (h) => -hotelScore(h) * 1000 + dist(h));
}
