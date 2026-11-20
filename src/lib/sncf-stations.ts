import { LatLng, StationData } from "@/src/types";
import { sncfConfig } from "@/src/config";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";

let cachedStations: StationData[] | null = null;
let cacheTime = 0;

async function fetchAllStations(): Promise<StationData[]> {
  const apiKey = sncfConfig.apiKey;
  if (!apiKey) throw new Error("SNCF_API_KEY not configured");

  const allStations: StationData[] = [];
  let startPage = 0;
  const pageSize = 1000;

  while (true) {
    const params = new URLSearchParams({
      count: String(pageSize),
      start_page: String(startPage),
    });

    const res = await fetch(
      `${sncfConfig.baseUrl}/coverage/sncf/stop_areas?${params}`,
      { headers: { Authorization: `Basic ${btoa(apiKey + ":")}` } }
    );

    if (!res.ok) break;

    const data = await res.json();
    const stopAreas = data.stop_areas || [];

    for (const sa of stopAreas) {
      if (!sa.coord || (sa.coord.lat === "0" && sa.coord.lon === "0")) continue;

      const lat = parseFloat(sa.coord.lat);
      const lng = parseFloat(sa.coord.lon);
      if (isNaN(lat) || isNaN(lng) || lat === 0) continue;

      allStations.push({
        id: sa.id,
        name: sa.name || sa.label || "",
        sncfId: sa.id,
        coords: { lat, lng },
      });
    }

    const pagination = data.pagination;
    if (!pagination || stopAreas.length < pageSize) break;
    startPage++;
  }

  return allStations;
}

/** All SNCF stop areas, fetched once and cached for `stationCacheTtl`. */
export async function getSncfStations(): Promise<StationData[]> {
  if (!cachedStations || Date.now() - cacheTime > sncfConfig.stationCacheTtl) {
    cachedStations = await fetchAllStations();
    cacheTime = Date.now();
  }
  return cachedStations;
}

export async function nearbySncfStations(point: LatLng, radiusKm: number, limit = 20) {
  const stations = await getSncfStations();
  return stations
    .map((s) => ({ ...s, dist: haversineDistance(point, s.coords) }))
    .filter((s) => s.dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}

/** UIC8 code carried by Navitia stop area ids (`stop_area:SNCF:87686006`). */
export function uicFromStopArea(id: string | undefined): string | null {
  const m = id?.match(/(\d{8})$/);
  return m ? m[1] : null;
}
