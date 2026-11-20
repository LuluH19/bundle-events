import { NextRequest } from "next/server";
import { sncfConfig } from "@/src/config";
import { getSncfStationsCached, nearbySncfStations } from "@/src/lib/sncf-stations";

// GET /api/stations — returns all stations (cached)
// GET /api/stations?lat=X&lng=Y&radius=50 — returns stations near a point
export async function GET(request: NextRequest) {
  if (!sncfConfig.apiKey) {
    return Response.json({ error: "SNCF_API_KEY not configured" }, { status: 500 });
  }

  let stations;
  let cacheStatus: string;
  try {
    const result = await getSncfStationsCached();
    stations = result.data;
    cacheStatus = result.status;
  } catch {
    return Response.json({ error: "Stations unavailable", stations: [], total: 0 }, { status: 503 });
  }
  const headers = { "X-Cache": cacheStatus };

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius");

  if (lat && lng) {
    const nearby = await nearbySncfStations(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius ? parseFloat(radius) : 50
    );
    return Response.json({ stations: nearby, total: stations.length }, { headers });
  }

  return Response.json({ total: stations.length, stations }, { headers });
}
