import type { BusConnection, BusNetwork, LatLng } from "@/src/types";
import { busConfig } from "@/src/config/bus";
import { haversineDistance } from "./geodesic";

interface NearStop {
  index: number;
  km: number;
}

function nearestStops(network: BusNetwork, point: LatLng): NearStop[] {
  return network.stops
    .map(([, lat, lng], index) => ({ index, km: haversineDistance(point, { lat, lng }) }))
    .filter((s) => s.km <= busConfig.maxAccessKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, busConfig.stopCandidates);
}

function accessMinutes(km: number): number {
  return ((km * busConfig.accessDetourFactor) / busConfig.accessSpeedKmh) * 60;
}

function hhmm(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function weekdayIndex(isoDate: string): number | null {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function findBusConnection(network: BusNetwork, from: LatLng, to: LatLng, date?: string): BusConnection | null {
  const weekday = date ? weekdayIndex(date) : null;
  const origins = nearestStops(network, from);
  const destinations = nearestStops(network, to);

  let best: { score: number; connection: BusConnection } | null = null;
  for (const o of origins) {
    for (const d of destinations) {
      if (o.index === d.index) continue;
      const entries = (network.links[`${o.index}-${d.index}`] ?? []).filter(
        ([, , mask]) => weekday === null || (mask & (1 << weekday)) !== 0
      );
      if (entries.length === 0) continue;
      const durationMinutes = Math.min(...entries.map(([, dur]) => dur));
      const score = accessMinutes(o.km) + durationMinutes + accessMinutes(d.km);
      if (best && best.score <= score) continue;
      const [fromName, fromLat, fromLng, operator] = network.stops[o.index];
      const [toName, toLat, toLng] = network.stops[d.index];
      best = {
        score,
        connection: {
          operator: network.operators[operator] ?? "",
          from: { name: fromName, coords: { lat: fromLat, lng: fromLng } },
          to: { name: toName, coords: { lat: toLat, lng: toLng } },
          durationMinutes,
          departures: entries.map(([dep, dur]) => ({
            departure: hhmm(dep),
            arrival: hhmm(dep + dur),
            durationMinutes: dur,
          })),
        },
      };
    }
  }
  return best?.connection ?? null;
}
