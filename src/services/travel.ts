import { LatLng, RouteOption, TrainJourney, FlightInfo, TransportMode } from "@/src/types";
import { computeDirectRoute, computeBusRoute, computePlaneRoute, computeTrainRoute, isShortHaulFlightBanned } from "@/src/utils/algorithms/routing";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";
import { airports } from "@/src/utils/constants/airports";
import { priceEstimate, findNearest } from "@/src/utils/travel";
import { dateOnly } from "@/src/utils/date";

export async function computeOptions(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): Promise<RouteOption[]> {
  const dist = haversineDistance(from.coords, to.coords);
  const promises: Promise<RouteOption | null>[] = [];

  const addOption = async (promise: Promise<import("@/src/types").RouteResult>, mode: TransportMode, accessMode?: TransportMode) => {
    try {
      const route = await promise;
      return {
        id: `${mode}-${accessMode || "direct"}`,
        mode,
        accessMode,
        route,
        durationMin: route.totalDurationMinutes,
        distanceKm: route.totalDistanceKm,
        price: priceEstimate(mode, route.totalDistanceKm),
      } as RouteOption;
    } catch {
      return null;
    }
  };

  if (dist < 8) {
    promises.push(addOption(computeDirectRoute(from, to, "walking"), "walking"));
  }
  promises.push(addOption(computeDirectRoute(from, to, "car"), "car"));
  
  if (dist > 10) {
    promises.push(addOption(computeBusRoute(from, to, ["walking"]), "bus", "walking"));
    promises.push(addOption(computeBusRoute(from, to, ["car"]), "bus", "car"));
  }
  
  if (dist > 20) {
    promises.push(addOption(computeTrainRoute(from, to, ["walking"]), "train", "walking"));
    promises.push(addOption(computeTrainRoute(from, to, ["bus"]), "train", "bus"));
    promises.push(addOption(computeTrainRoute(from, to, ["train"]), "train", "train"));
    promises.push(addOption(computeTrainRoute(from, to, ["car"]), "train", "car"));
  }
  
  if (dist > 200 && !(await isShortHaulFlightBanned(from, to))) {
    promises.push(addOption(computePlaneRoute(from, to, ["walking"]), "plane", "walking"));
    promises.push(addOption(computePlaneRoute(from, to, ["bus"]), "plane", "bus"));
    promises.push(addOption(computePlaneRoute(from, to, ["train"]), "plane", "train"));
    promises.push(addOption(computePlaneRoute(from, to, ["car"]), "plane", "car"));
  }

  const results = await Promise.all(promises);
  // Filter out duplicates (sometimes computePlaneRoute with 'walking' falls back to 'car' if too far, returning same result)
  const uniqueOptions = new Map<string, RouteOption>();
  for (const r of results.filter(Boolean) as RouteOption[]) {
    // create a unique key based on segments length and duration
    const key = r.mode + "-" + r.route.segments.length + "-" + Math.round(r.durationMin / 5) * 5;
    if (!uniqueOptions.has(key)) uniqueOptions.set(key, r);
  }

  return Array.from(uniqueOptions.values()).sort((a, b) => a.durationMin - b.durationMin);
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
