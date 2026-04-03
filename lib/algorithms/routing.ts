import type { LatLng, RouteResult, RouteSegment, TransportMode } from "@/lib/types";
import { airports } from "@/lib/data/airports";
import { busStations } from "@/lib/data/bus-stations";
import { findNearestByDistance, findNearestByDistanceSorted } from "./dijkstra";
import {
  haversineDistance,
  interpolateGreatCircle,
  estimateFlightDuration,
} from "./geodesic";

// Dynamic station type (fetched from SNCF API)
interface DynamicStation {
  id: string;
  name: string;
  sncfId: string;
  coords: LatLng;
}

// Cache for fetched stations near a point
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

// Vitesses moyennes en km/h (source: ADEME / moyennes constatees France)
const AVG_SPEED_KMH: Record<TransportMode, number> = {
  walking: 4.5,
  car: 70,
  bus: 55,
  train: 200,
  plane: 800,
};

// Overhead en minutes par mode (embarquement, attente, etc.)
const OVERHEAD_MINUTES: Record<TransportMode, number> = {
  walking: 0,
  car: 0,
  bus: 20,
  train: 15,
  plane: 60,
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

  // Utiliser les vitesses moyennes plutôt que les estimations OSRM
  // OSRM est fiable pour le tracé mais pas toujours pour la durée
  let durationMinutes: number;
  if (mode === "walking") {
    durationMinutes = (distanceKm / AVG_SPEED_KMH.walking) * 60;
  } else if (mode === "bus") {
    durationMinutes = (distanceKm / AVG_SPEED_KMH.bus) * 60;
  } else {
    // Voiture: OSRM est fiable (tient compte du trafic/limitations)
    durationMinutes = route.duration / 60;
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

// Train: utilise OSRM driving pour le tracé, vitesse train pour la durée
// Train: fetch le trace via les gares intermediaires SNCF + OSRM multi-waypoint
async function trainSegment(
  from: { name: string; coords: LatLng; sncfId?: string },
  to: { name: string; coords: LatLng; sncfId?: string }
): Promise<RouteSegment> {
  let coordinates: [number, number][];
  let distanceKm: number;

  // Try to get the real rail route via intermediate stops
  if (from.sncfId && to.sncfId) {
    try {
      const res = await fetch(`/api/trains/route-geometry?from=${from.sncfId}&to=${to.sncfId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.coordinates?.length > 5) {
          coordinates = data.coordinates;
          // Estimate distance from coordinates
          distanceKm = 0;
          for (let i = 1; i < coordinates.length; i++) {
            distanceKm += haversineDistance(
              { lat: coordinates[i - 1][0], lng: coordinates[i - 1][1] },
              { lat: coordinates[i][0], lng: coordinates[i][1] }
            );
          }
          const durationMinutes = (distanceKm / AVG_SPEED_KMH.train) * 60 + OVERHEAD_MINUTES.train;
          return { from, to, mode: "train", coordinates, distanceKm, durationMinutes, co2Kg: co2ForSegment(distanceKm, "train") };
        }
      }
    } catch { /* fallback below */ }
  }

  // Fallback: OSRM driving route
  const osrm = await fetchOSRMSegment(from, to, "car");
  distanceKm = osrm.distanceKm;
  const durationMinutes = (distanceKm / AVG_SPEED_KMH.train) * 60 + OVERHEAD_MINUTES.train;
  return { from, to, mode: "train", coordinates: osrm.coordinates, distanceKm, durationMinutes, co2Kg: co2ForSegment(distanceKm, "train") };
}

async function busLongSegment(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): Promise<RouteSegment> {
  const osrm = await fetchOSRMSegment(from, to, "car");
  const distanceKm = osrm.distanceKm;
  const durationMinutes = (distanceKm / AVG_SPEED_KMH.bus) * 60 + OVERHEAD_MINUTES.bus;
  return { from, to, mode: "bus", coordinates: osrm.coordinates, distanceKm, durationMinutes, co2Kg: co2ForSegment(distanceKm, "bus") };
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
  const depCandidates = findNearestByDistanceSorted(from.coords, busStations, 3);
  const arrCandidates = findNearestByDistanceSorted(to.coords, busStations, 3);
  let depBusStation = depCandidates[0];
  let arrBusStation = arrCandidates[0];

  if (depBusStation.id === arrBusStation.id) {
    if (arrCandidates.length > 1) arrBusStation = arrCandidates[1];
    if (depBusStation.id === arrBusStation.id && depCandidates.length > 1) {
      depBusStation = depCandidates[1]; arrBusStation = arrCandidates[0];
    }
  }

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

  const bus = await busLongSegment(depPoint, arrPoint);

  return buildResult([toStation, bus, fromStation]);
}

export async function computePlaneRoute(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng },
  allowedAccessModes: ("walking" | "car" | "bus")[]
): Promise<RouteResult> {
  const depCandidates = findNearestByDistanceSorted(from.coords, airports, 3);
  const arrCandidates = findNearestByDistanceSorted(to.coords, airports, 3);
  let depAirport = depCandidates[0];
  let arrAirport = arrCandidates[0];

  if (depAirport.id === arrAirport.id) {
    if (arrCandidates.length > 1) arrAirport = arrCandidates[1];
    if (depAirport.id === arrAirport.id && depCandidates.length > 1) {
      depAirport = depCandidates[1]; arrAirport = arrCandidates[0];
    }
    if (depAirport.id === arrAirport.id) {
      throw new Error(`Meme aeroport (${depAirport.name}) — l'avion n'est pas adapte pour cette distance`);
    }
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
  // Fetch real SNCF stations near both points
  const [depStations, arrStations] = await Promise.all([
    fetchNearbyStations(from.coords),
    fetchNearbyStations(to.coords),
  ]);

  if (depStations.length === 0 || arrStations.length === 0) {
    throw new Error("Aucune gare trouvee a proximite");
  }

  const depCandidates = depStations.slice(0, 5);
  const arrCandidates = arrStations.slice(0, 5);

  // Find a pair of different stations
  let depStation = depCandidates[0];
  let arrStation = arrCandidates[0];

  if (depStation.id === arrStation.id) {
    // Try the 2nd closest for arrival
    if (arrCandidates.length > 1) {
      arrStation = arrCandidates[1];
    }
    // If still same, try 2nd closest for departure
    if (depStation.id === arrStation.id && depCandidates.length > 1) {
      depStation = depCandidates[1];
      arrStation = arrCandidates[0];
    }
    if (depStation.id === arrStation.id) {
      throw new Error(`Pas de gares differentes trouvees — le train n'est pas adapte pour cette distance`);
    }
  }

  const depPoint = { name: depStation.name, coords: depStation.coords, sncfId: depStation.sncfId };
  const arrPoint = { name: arrStation.name, coords: arrStation.coords, sncfId: arrStation.sncfId };

  const [toStation, fromStation] = await Promise.all([
    accessSegment(from, depPoint, allowedAccessModes),
    accessSegment(arrPoint, to, allowedAccessModes),
  ]);

  const train = await trainSegment(depPoint, arrPoint);

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
