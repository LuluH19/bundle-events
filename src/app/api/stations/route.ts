import { NextRequest } from "next/server";
import { getSncfStations, nearbySncfStations } from "@/src/lib/sncf-stations";

// GET /api/stations — returns all stations (cached)
// GET /api/stations?lat=X&lng=Y&radius=50 — returns stations near a point
export async function GET(request: NextRequest) {
  let stations;
  try {
    stations = await getSncfStations();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius");

  if (lat && lng) {
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
