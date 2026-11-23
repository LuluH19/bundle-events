import type { LatLng } from "@/src/types";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";
import { MAIN_STATION_DETOUR_KM, MAIN_STATION_UICS } from "@/src/utils/constants/main-stations";

interface StationLike {
  id: string;
  sncfId: string;
  coords: LatLng;
}

export function isMainStation(s: Pick<StationLike, "sncfId">): boolean {
  const uic = s.sncfId.match(/(\d{8})$/)?.[1];
  return !!uic && MAIN_STATION_UICS.has(uic);
}

export function rankStations<T extends StationLike>(point: LatLng, stations: T[]): T[] {
  const byDistance = [...stations]
    .map((s) => ({ s, d: haversineDistance(point, s.coords) }))
    .sort((a, b) => a.d - b.d);
  if (!byDistance.length) return [];
  const limit = byDistance[0].d + MAIN_STATION_DETOUR_KM;
  const main = byDistance.find((x) => x.d <= limit && isMainStation(x.s));
  const ordered = main ? [main, ...byDistance.filter((x) => x !== main)] : byDistance;
  return ordered.map((x) => x.s);
}

export function pickStationPair<T extends StationLike>(from: LatLng, to: LatLng, depStations: T[], arrStations: T[]): [T, T] | null {
  const deps = rankStations(from, depStations);
  const arrs = rankStations(to, arrStations);
  if (!deps.length || !arrs.length) return null;
  let dep = deps[0];
  let arr = arrs[0];
  if (dep.id === arr.id) {
    if (arrs.length > 1) arr = arrs[1];
    if (dep.id === arr.id && deps.length > 1) {
      dep = deps[1];
      arr = arrs[0];
    }
    if (dep.id === arr.id) return null;
  }
  return [dep, arr];
}
