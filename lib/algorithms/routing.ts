import type { LatLng, RouteResult, RouteSegment, TransportMode } from "@/lib/types";
import { airports } from "@/lib/data/airports";
import { busStations } from "@/lib/data/bus-stations";
import {
  haversineDistance,
  interpolateGreatCircle,
  estimateFlightDuration,
} from "./geodesic";

interface DynamicStation {
  id: string;
  name: string;
  sncfId: string;
  coords: LatLng;
}

const stationCache = new Map<string, DynamicStation[]>();

async function fetchNearbyStations(point: LatLng, radiusKm: number = 80): Promise<DynamicStation[]> {
  const cacheKey = `${point.lat.toFixed(2)},${point.lng.toFixed(2)},${radiusKm}`;
  const cached = stationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/stations?lat=${point.lat}&lng=${point.lng}&radius=${radiusKm}`);
    if (!res.ok) return [];
    const data = await res.json();
    const stations = data.stations || [];
    stationCache.set(cacheKey, stations);
    return stations;
  } catch {
    return [];
  }
}

function findNearest<T extends { coords: LatLng }>(point: LatLng, items: T[]): T {
  return items.reduce((best, item) =>
    haversineDistance(point, item.coords) < haversineDistance(point, best.coords) ? item : best
  );
}

function findNearestSorted<T extends { coords: LatLng; id: string }>(point: LatLng, items: T[], count: number = 3): T[] {
  return [...items]
    .map((item) => ({ item, dist: haversineDistance(point, item.coords) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((x) => x.item);
}

const OSRM_BASE = "https://router.project-osrm.org/route/v1";

const osrmProfileMap: Record<string, string> = {
  car: "driving",
  bus: "driving",
  walking: "foot",
};

async function fetchOSRMSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  mode: "car" | "bus" | "walking"
): Promise<RouteSegment> {
  const profile = osrmProfileMap[mode];
  const url = `${OSRM_BASE}/${profile}/${from.coords.lng},${from.coords.lat};${to.coords.lng},${to.coords.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`OSRM: pas de route trouvee (${data.code})`);
  }

  const route = data.routes[0];
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  const distanceKm = route.distance / 1000;
  const durationMinutes = route.duration / 60;

  return { from, to, mode, coordinates, distanceKm, durationMinutes };
}

function planeSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): RouteSegment {
  const distanceKm = haversineDistance(from.coords, to.coords);
  const coordinates = interpolateGreatCircle(from.coords, to.coords);
  const durationMinutes = estimateFlightDuration(distanceKm);
  return { from, to, mode: "plane", coordinates, distanceKm, durationMinutes };
}

async function trainSegment(
  from: { name: string; coords: LatLng; sncfId?: string },
  to: { name: string; coords: LatLng; sncfId?: string }
): Promise<RouteSegment> {
  // Try real rail route via SNCF intermediate stops + OSRM multi-waypoint
  if (from.sncfId && to.sncfId) {
    try {
      const res = await fetch(`/api/trains/route-geometry?from=${from.sncfId}&to=${to.sncfId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.coordinates?.length > 5) {
          let distanceKm = 0;
          for (let i = 1; i < data.coordinates.length; i++) {
            distanceKm += haversineDistance(
              { lat: data.coordinates[i - 1][0], lng: data.coordinates[i - 1][1] },
              { lat: data.coordinates[i][0], lng: data.coordinates[i][1] }
            );
          }
          const durationMinutes = (distanceKm / 200) * 60;
          return { from, to, mode: "train", coordinates: data.coordinates, distanceKm, durationMinutes };
        }
      }
    } catch { /* fallback */ }
  }

  const osrm = await fetchOSRMSegment(from, to, "car");
  const durationMinutes = (osrm.distanceKm / 200) * 60;
  return { from, to, mode: "train", coordinates: osrm.coordinates, distanceKm: osrm.distanceKm, durationMinutes };
}

async function busLongSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): Promise<RouteSegment> {
  const osrm = await fetchOSRMSegment(from, to, "car");
  const durationMinutes = (osrm.distanceKm / 55) * 60;
  return { from, to, mode: "bus", coordinates: osrm.coordinates, distanceKm: osrm.distanceKm, durationMinutes };
}

async function accessSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteSegment> {
  const dist = haversineDistance(from.coords, to.coords);
  const viable = allowedAccessModes.filter((m) => !(m === "walking" && dist > 8));

  if (viable.length === 0) {
    return fetchOSRMSegment(from, to, allowedAccessModes[0] || "walking");
  }

  const results = await Promise.all(
    viable.map((m) => fetchOSRMSegment(from, to, m).catch(() => null))
  );
  const valid = results.filter(Boolean) as RouteSegment[];

  if (valid.length === 0) {
    return fetchOSRMSegment(from, to, viable[0]);
  }

  return valid.reduce((best, seg) =>
    seg.durationMinutes < best.durationMinutes ? seg : best
  );
}

function extractAccessModes(modes: TransportMode[]): ("walking" | "car" | "bus")[] {
  const access: ("walking" | "car" | "bus")[] = [];
  if (modes.includes("walking")) access.push("walking");
  if (modes.includes("car")) access.push("car");
  if (modes.includes("bus")) access.push("bus");
  if (access.length === 0) return ["walking", "car"];
  return access;
}

function buildResult(segments: RouteSegment[]): RouteResult {
  return {
    segments,
    totalDistanceKm: segments.reduce((s, seg) => s + seg.distanceKm, 0),
    totalDurationMinutes: segments.reduce((s, seg) => s + seg.durationMinutes, 0),
    isMultimodal: new Set(segments.map((s) => s.mode)).size > 1,
  };
}

export async function computeDirectRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  mode: "car" | "walking"
): Promise<RouteResult> {
  return buildResult([await fetchOSRMSegment(from, to, mode)]);
}

export async function computeBusRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteResult> {
  const depCandidates = findNearestSorted(from.coords, busStations, 3);
  const arrCandidates = findNearestSorted(to.coords, busStations, 3);
  let dep = depCandidates[0], arr = arrCandidates[0];

  if (dep.id === arr.id) {
    if (arrCandidates.length > 1) arr = arrCandidates[1];
    if (dep.id === arr.id && depCandidates.length > 1) { dep = depCandidates[1]; arr = arrCandidates[0]; }
  }

  if (dep.id === arr.id || haversineDistance(from.coords, to.coords) < 15) {
    const seg = await fetchOSRMSegment(from, to, "bus" as "car");
    return buildResult([{ ...seg, mode: "bus" }]);
  }

  const accessOnly = allowedAccessModes.filter((m) => m !== "bus") as ("walking" | "car" | "bus")[];
  const [toStation, fromStation] = await Promise.all([
    accessSegment(from, { name: dep.name, coords: dep.coords }, accessOnly.length > 0 ? accessOnly : ["walking"]),
    accessSegment({ name: arr.name, coords: arr.coords }, to, accessOnly.length > 0 ? accessOnly : ["walking"]),
  ]);

  return buildResult([toStation, await busLongSegment({ name: dep.name, coords: dep.coords }, { name: arr.name, coords: arr.coords }), fromStation]);
}

export async function computePlaneRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteResult> {
  const depCandidates = findNearestSorted(from.coords, airports, 3);
  const arrCandidates = findNearestSorted(to.coords, airports, 3);
  let dep = depCandidates[0], arr = arrCandidates[0];

  if (dep.id === arr.id) {
    if (arrCandidates.length > 1) arr = arrCandidates[1];
    if (dep.id === arr.id && depCandidates.length > 1) { dep = depCandidates[1]; arr = arrCandidates[0]; }
    if (dep.id === arr.id) throw new Error("Meme aeroport - avion pas adapte");
  }

  const [toAirport, fromAirport] = await Promise.all([
    accessSegment(from, { name: dep.name, coords: dep.coords }, allowedAccessModes),
    accessSegment({ name: arr.name, coords: arr.coords }, to, allowedAccessModes),
  ]);

  return buildResult([toAirport, planeSegment({ name: dep.name, coords: dep.coords }, { name: arr.name, coords: arr.coords }), fromAirport]);
}

export async function computeTrainRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteResult> {
  const [depStations, arrStations] = await Promise.all([
    fetchNearbyStations(from.coords),
    fetchNearbyStations(to.coords),
  ]);

  if (depStations.length === 0 || arrStations.length === 0) {
    throw new Error("Aucune gare trouvee a proximite");
  }

  let dep = depStations[0], arr = arrStations[0];
  if (dep.id === arr.id) {
    if (arrStations.length > 1) arr = arrStations[1];
    if (dep.id === arr.id && depStations.length > 1) { dep = depStations[1]; arr = arrStations[0]; }
    if (dep.id === arr.id) throw new Error("Pas de gares differentes trouvees");
  }

  const depPoint = { name: dep.name, coords: dep.coords, sncfId: dep.sncfId };
  const arrPoint = { name: arr.name, coords: arr.coords, sncfId: arr.sncfId };

  const [toStation, fromStation] = await Promise.all([
    accessSegment(from, depPoint, allowedAccessModes),
    accessSegment(arrPoint, to, allowedAccessModes),
  ]);

  return buildResult([toStation, await trainSegment(depPoint, arrPoint), fromStation]);
}

export async function computeMultimodalRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedModes: TransportMode[]
): Promise<RouteResult> {
  const dist = haversineDistance(from.coords, to.coords);
  const access = extractAccessModes(allowedModes);
  const candidates: Promise<RouteResult | null>[] = [];

  if (allowedModes.includes("walking") && dist < 10) candidates.push(computeDirectRoute(from, to, "walking").catch(() => null));
  if (allowedModes.includes("car")) candidates.push(computeDirectRoute(from, to, "car").catch(() => null));
  if (allowedModes.includes("bus")) candidates.push(computeBusRoute(from, to, access).catch(() => null));
  if (allowedModes.includes("train") && dist > 20) candidates.push(computeTrainRoute(from, to, access).catch(() => null));
  if (allowedModes.includes("plane") && dist > 150) candidates.push(computePlaneRoute(from, to, access).catch(() => null));

  if (candidates.length === 0) return computeDirectRoute(from, to, "car");
  const results = (await Promise.all(candidates)).filter(Boolean) as RouteResult[];
  if (results.length === 0) return computeDirectRoute(from, to, "car");
  return results.reduce((best, r) => r.totalDurationMinutes < best.totalDurationMinutes ? r : best);
}

export async function computeRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  modes: TransportMode[]
): Promise<RouteResult> {
  const access = extractAccessModes(modes);
  if (modes.length === 1) {
    switch (modes[0]) {
      case "car": case "walking": return computeDirectRoute(from, to, modes[0]);
      case "bus": return computeBusRoute(from, to, access);
      case "plane": return computePlaneRoute(from, to, access);
      case "train": return computeTrainRoute(from, to, access);
    }
  }
  return computeMultimodalRoute(from, to, modes);
}
