import type { LatLng, RouteResult, RouteSegment, TransportMode } from "@/lib/types";
import { stations } from "@/lib/data/stations";
import { airports } from "@/lib/data/airports";
import { busStations } from "@/lib/data/bus-stations";
import { findNearestByDistance } from "./dijkstra";
import {
  haversineDistance,
  interpolateGreatCircle,
  estimateFlightDuration,
} from "./geodesic";

const OSRM_BASE = "https://router.project-osrm.org/route/v1";

const osrmProfileMap: Record<string, string> = {
  car: "driving",
  bus: "driving",
  walking: "foot",
};

// CO2 emissions in kg per km per passenger (ADEME France averages)
const CO2_KG_PER_KM: Record<TransportMode, number> = {
  walking: 0,
  car: 0.193,     // voiture moyenne FR
  bus: 0.035,     // autocar longue distance
  train: 0.006,   // TGV electrique
  plane: 0.230,   // vol domestique FR
};

function co2ForSegment(distanceKm: number, mode: TransportMode): number {
  return distanceKm * CO2_KG_PER_KM[mode];
}

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

  let durationMinutes = route.duration / 60;
  const distanceKm = route.distance / 1000;

  if (mode === "bus") {
    durationMinutes *= 1.3;
  }

  return { from, to, mode, coordinates, distanceKm, durationMinutes, co2Kg: co2ForSegment(distanceKm, mode) };
}

function planeSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): RouteSegment {
  const distanceKm = haversineDistance(from.coords, to.coords);
  const coordinates = interpolateGreatCircle(from.coords, to.coords);
  const durationMinutes = estimateFlightDuration(distanceKm);
  return { from, to, mode: "plane", coordinates, distanceKm, durationMinutes, co2Kg: co2ForSegment(distanceKm, "plane") };
}

function trainSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): RouteSegment {
  const distanceKm = haversineDistance(from.coords, to.coords);
  const durationMinutes = (distanceKm / 250) * 60 + 15;
  const coordinates = interpolateGreatCircle(from.coords, to.coords, 50);
  return { from, to, mode: "train", coordinates, distanceKm, durationMinutes, co2Kg: co2ForSegment(distanceKm, "train") };
}

function busLongSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): RouteSegment {
  const distanceKm = haversineDistance(from.coords, to.coords);
  const durationMinutes = (distanceKm / 60) * 60 + 20;
  const coordinates = interpolateGreatCircle(from.coords, to.coords, 50);
  return { from, to, mode: "bus", coordinates, distanceKm, durationMinutes, co2Kg: co2ForSegment(distanceKm, "bus") };
}

async function accessSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteSegment> {
  const dist = haversineDistance(from.coords, to.coords);

  const viable = allowedAccessModes.filter((m) => {
    if (m === "walking" && dist > 8) return false;
    return true;
  });

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
    totalCo2Kg: segments.reduce((s, seg) => s + seg.co2Kg, 0),
    isMultimodal: new Set(segments.map((s) => s.mode)).size > 1,
  };
}

// ---- Public API ----

export async function computeDirectRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  mode: "car" | "walking"
): Promise<RouteResult> {
  const seg = await fetchOSRMSegment(from, to, mode);
  return buildResult([seg]);
}

export async function computeBusRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteResult> {
  const depBusStation = findNearestByDistance(from.coords, busStations);
  const arrBusStation = findNearestByDistance(to.coords, busStations);

  if (depBusStation.id === arrBusStation.id || haversineDistance(from.coords, to.coords) < 15) {
    const seg = await fetchOSRMSegment(from, to, "bus" as "car");
    return buildResult([{ ...seg, mode: "bus", co2Kg: co2ForSegment(seg.distanceKm, "bus") }]);
  }

  const depPoint = { name: depBusStation.name, coords: depBusStation.coords };
  const arrPoint = { name: arrBusStation.name, coords: arrBusStation.coords };

  const accessOnly = allowedAccessModes.filter((m) => m !== "bus") as ("walking" | "car" | "bus")[];
  const accessModes = accessOnly.length > 0 ? accessOnly : ["walking" as const];

  const [toStation, fromStation] = await Promise.all([
    accessSegment(from, depPoint, accessModes),
    accessSegment(arrPoint, to, accessModes),
  ]);

  const bus = busLongSegment(depPoint, arrPoint);

  return buildResult([toStation, bus, fromStation]);
}

export async function computePlaneRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteResult> {
  const depAirport = findNearestByDistance(from.coords, airports);
  const arrAirport = findNearestByDistance(to.coords, airports);

  if (depAirport.id === arrAirport.id) {
    throw new Error(`Meme aeroport (${depAirport.name}) — l'avion n'est pas adapte pour cette distance`);
  }

  const depPoint = { name: depAirport.name, coords: depAirport.coords };
  const arrPoint = { name: arrAirport.name, coords: arrAirport.coords };

  const [toAirport, fromAirport] = await Promise.all([
    accessSegment(from, depPoint, allowedAccessModes),
    accessSegment(arrPoint, to, allowedAccessModes),
  ]);

  const flight = planeSegment(depPoint, arrPoint);

  return buildResult([toAirport, flight, fromAirport]);
}

export async function computeTrainRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteResult> {
  const depStation = findNearestByDistance(from.coords, stations);
  const arrStation = findNearestByDistance(to.coords, stations);

  if (depStation.id === arrStation.id) {
    throw new Error(`Meme gare (${depStation.name}) — le train n'est pas adapte pour cette distance`);
  }

  const depPoint = { name: depStation.name, coords: depStation.coords };
  const arrPoint = { name: arrStation.name, coords: arrStation.coords };

  const [toStation, fromStation] = await Promise.all([
    accessSegment(from, depPoint, allowedAccessModes),
    accessSegment(arrPoint, to, allowedAccessModes),
  ]);

  const train = trainSegment(depPoint, arrPoint);

  return buildResult([toStation, train, fromStation]);
}

export async function computeMultimodalRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedModes: TransportMode[]
): Promise<RouteResult> {
  const dist = haversineDistance(from.coords, to.coords);
  const access = extractAccessModes(allowedModes);

  const candidates: Promise<RouteResult | null>[] = [];

  if (allowedModes.includes("walking") && dist < 10) {
    candidates.push(computeDirectRoute(from, to, "walking").catch(() => null));
  }
  if (allowedModes.includes("car")) {
    candidates.push(computeDirectRoute(from, to, "car").catch(() => null));
  }
  if (allowedModes.includes("bus")) {
    candidates.push(computeBusRoute(from, to, access).catch(() => null));
  }
  if (allowedModes.includes("train") && dist > 20) {
    candidates.push(computeTrainRoute(from, to, access).catch(() => null));
  }
  if (allowedModes.includes("plane") && dist > 150) {
    candidates.push(computePlaneRoute(from, to, access).catch(() => null));
  }

  if (candidates.length === 0) {
    return computeDirectRoute(from, to, "car");
  }

  const results = (await Promise.all(candidates)).filter(Boolean) as RouteResult[];

  if (results.length === 0) {
    return computeDirectRoute(from, to, "car");
  }

  return results.reduce((best, r) =>
    r.totalDurationMinutes < best.totalDurationMinutes ? r : best
  );
}

export async function computeRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  modes: TransportMode[]
): Promise<RouteResult> {
  const access = extractAccessModes(modes);

  if (modes.length === 1) {
    const mode = modes[0];
    switch (mode) {
      case "car":
      case "walking":
        return computeDirectRoute(from, to, mode);
      case "bus":
        return computeBusRoute(from, to, access);
      case "plane":
        return computePlaneRoute(from, to, access);
      case "train":
        return computeTrainRoute(from, to, access);
    }
  }
  return computeMultimodalRoute(from, to, modes);
}
