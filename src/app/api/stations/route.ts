import { NextRequest } from "next/server";
import { StationData } from "@/src/types";
import { apiCacheConfig, sncfConfig } from "@/src/config";
import { cached } from "@/src/lib/api-cache";

// The full stop_areas list barely changes: shared cache (memory + Supabase), 7 days fresh.
async function fetchAllStations(): Promise<StationData[]> {
  const apiKey = sncfConfig.apiKey;

  const allStations: StationData[] = [];
  let startPage = 0;
  const pageSize = 1000;

  // Fetch all pages
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
      // Skip stations without valid coordinates
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

    // Check if there are more pages
    const pagination = data.pagination;
    if (!pagination || stopAreas.length < pageSize) break;
    startPage++;
  }

  return allStations;
}
import { getSncfStations, nearbySncfStations } from "@/src/lib/sncf-stations";

// GET /api/stations — returns all stations (cached)
// GET /api/stations?lat=X&lng=Y&radius=50 — returns stations near a point
export async function GET(request: NextRequest) {
  if (!sncfConfig.apiKey) {
    return Response.json({ error: "SNCF_API_KEY not configured" }, { status: 500 });
  }

  let cachedStations: StationData[];
  let cacheStatus: string;
  try {
    const result = await cached({
      provider: "sncf",
      key: "stations:all",
      ...apiCacheConfig.policies.stations,
      fetcher: fetchAllStations,
    });
    cachedStations = result.data;
    cacheStatus = result.status;
  } catch {
    return Response.json({ error: "Stations unavailable", stations: [], total: 0 }, { status: 503 });
  let stations;
  try {
    stations = await getSncfStations();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  const headers = { "X-Cache": cacheStatus };

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius");

  if (lat && lng) {
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    const rKm = radius ? parseFloat(radius) : 50;

    const nearby = cachedStations
      .map((s) => {
        // Haversine distance
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(s.coords.lat - pLat);
        const dLng = toRad(s.coords.lng - pLng);
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(pLat)) * Math.cos(toRad(s.coords.lat)) * Math.sin(dLng / 2) ** 2;
        const dist = 6371 * 2 * Math.asin(Math.sqrt(a));
        return { ...s, dist };
      })
      .filter((s) => s.dist <= rKm)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20);

    return Response.json({ stations: nearby, total: cachedStations.length }, { headers });
  }

  // Return count + summary
  return Response.json(
    {
      total: cachedStations.length,
      stations: cachedStations,
    },
    { headers }
  );
    const nearby = await nearbySncfStations(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius ? parseFloat(radius) : 50
    );
    return Response.json({ stations: nearby, total: stations.length });
  }

  return Response.json({
    total: stations.length,
    stations,
  });
}
