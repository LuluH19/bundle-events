import { LatLng, RouteOption, TrainJourney, FlightInfo, TransportMode } from "@/src/types";
import { computeRoute } from "@/src/utils/algorithms/routing";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";
import { airports } from "@/src/utils/constants/airports";
import { priceEstimate, findNearest } from "@/src/utils/travel";

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

export async function fetchFlightInfo(from: LatLng, to: LatLng): Promise<FlightInfo[]> {
  const dep = findNearest(from, airports);
  const arr = findNearest(to, airports);
  if (dep.id === arr.id) return [];
  try {
    const res = await fetch(`/api/flights/search?origin=${dep.iataCode}&destination=${arr.iataCode}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.flights || [];
  } catch {
    return [];
  }
}

export async function fetchTrainInfo(from: LatLng, to: LatLng): Promise<TrainJourney[]> {
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
    const res = await fetch(`/api/trains/search?from=${dep.sncfId}&to=${arr.sncfId}`);
    if (!res.ok) return [];
    return (await res.json()).journeys || [];
  } catch {
    return [];
  }
}
