import { LatLng, RouteOption, TrainJourney, FlightInfo, TransportMode } from "@/src/types";
import { computeRoute } from "@/src/utils/algorithms/routing";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";
import { airports } from "@/src/utils/constants/airports";
import { priceEstimate, findNearest } from "@/src/utils/travel";
import { dateOnly } from "@/src/utils/date";

export async function computeOptions(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): Promise<RouteOption[]> {
  const dist = haversineDistance(from.coords, to.coords);
  const modes: TransportMode[] = [];
  if (dist < 8) modes.push("walking");
  modes.push("car", "bus");
  if (dist > 20) modes.push("train");
  if (dist > 200) modes.push("plane");

  const results = await Promise.all(
    modes.map(async (mode) => {
      try {
        const route = await computeRoute(from, to, [mode]);
        return {
          mode,
          route,
          durationMin: route.totalDurationMinutes,
          distanceKm: route.totalDistanceKm,
          price: priceEstimate(mode, route.totalDistanceKm),
        } as RouteOption;
      } catch {
        return null;
      }
    })
  );
  return (results.filter(Boolean) as RouteOption[]).sort((a, b) => a.durationMin - b.durationMin);
}

export async function fetchFlightInfo(
  from: LatLng,
  to: LatLng,
  departISO?: string
): Promise<FlightInfo[]> {
  const dep = findNearest(from, airports);
  const arr = findNearest(to, airports);
  if (dep.id === arr.id) return [];
  try {
    const params = new URLSearchParams({ origin: dep.iataCode, destination: arr.iataCode });
    if (departISO) params.set("departure_at", dateOnly(departISO));
    const res = await fetch(`/api/flights/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.flights || [];
  } catch {
    return [];
  }
}

export async function fetchTrainInfo(
  from: LatLng,
  to: LatLng,
  departISO?: string
): Promise<TrainJourney[]> {
  try {
    const [d, a] = await Promise.all([
      fetch(`/api/stations?lat=${from.lat}&lng=${from.lng}&radius=50`),
      fetch(`/api/stations?lat=${to.lat}&lng=${to.lng}&radius=50`),
    ]);
    if (!d.ok || !a.ok) return [];
    const ds = (await d.json()).stations || [];
    const as = (await a.json()).stations || [];
    if (!ds.length || !as.length) return [];
    const dep = ds[0];
    let arr = as[0];
    if (dep.id === arr.id && as.length > 1) arr = as[1];
    if (dep.id === arr.id) return [];
    const params = new URLSearchParams({ from: dep.sncfId, to: arr.sncfId });
    if (departISO) params.set("datetime", departISO);
    const res = await fetch(`/api/trains/search?${params}`);
    if (!res.ok) return [];
    return (await res.json()).journeys || [];
  } catch {
    return [];
  }
}
