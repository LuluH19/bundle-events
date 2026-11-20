import type { LatLng } from "@/src/types";
import { mapboxConfig, osrmConfig } from "@/src/config";
import { firstSuccess } from "@/src/utils/fallback";

export type RoadProfile = "car" | "walking";

export interface RoadRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
}

interface DirectionsResponse {
  code?: string;
  routes?: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[];
}

const MAPBOX_PROFILE: Record<RoadProfile, string> = { car: "driving", walking: "walking" };
const OSRM_PROFILE: Record<RoadProfile, string> = { car: "driving", walking: "foot" };

function toWaypoints(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(";");
}

function parseRoute(data: DirectionsResponse, provider: string): RoadRoute {
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error(`${provider}: no route (${data.code})`);
  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
}

async function mapboxRoute(points: LatLng[], profile: RoadProfile): Promise<RoadRoute> {
  if (!mapboxConfig.token) throw new Error("Mapbox token missing");
  const params = new URLSearchParams({ geometries: "geojson", overview: "full", access_token: mapboxConfig.token });
  const res = await fetch(`${mapboxConfig.directionsBaseUrl}/${MAPBOX_PROFILE[profile]}/${toWaypoints(points)}?${params}`, {
    signal: AbortSignal.timeout(mapboxConfig.directionsTimeoutMs),
  });
  if (!res.ok) throw new Error(`Mapbox Directions error: ${res.status}`);
  return parseRoute(await res.json(), "Mapbox Directions");
}

async function osrmRoute(points: LatLng[], profile: RoadProfile): Promise<RoadRoute> {
  const res = await fetch(`${osrmConfig.baseUrl}/${OSRM_PROFILE[profile]}/${toWaypoints(points)}?overview=full&geometries=geojson`);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);
  return parseRoute(await res.json(), "OSRM");
}

export async function fetchRoadRoute(points: LatLng[], profile: RoadProfile): Promise<RoadRoute> {
  const { value } = await firstSuccess([
    { name: "mapbox", run: () => mapboxRoute(points, profile) },
    { name: "osrm", run: () => osrmRoute(points, profile) },
  ]);
  return value;
}
