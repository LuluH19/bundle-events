import { LatLng, StationData } from "@/src/types";
import { apiCacheConfig, sncfConfig } from "@/src/config";
import { cached, type CachedResult } from "@/src/lib/api-cache";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";

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

    // Never cache a partial list: a failed page fails the whole fetch (stale copy served instead).
    if (!res.ok) throw new Error(`SNCF stop_areas error: ${res.status}`);

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

/** All SNCF stop areas. The list barely changes: shared cache (memory + Supabase), 7 days fresh. */
export function getSncfStationsCached(): Promise<CachedResult<StationData[]>> {
  return cached({
    provider: "sncf",
    key: "stations:all",
    ...apiCacheConfig.policies.stations,
    fetcher: fetchAllStations,
  });
}

export async function getSncfStations(): Promise<StationData[]> {
  return (await getSncfStationsCached()).data;
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
