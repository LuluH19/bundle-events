import { NextRequest } from "next/server";

interface StationData {
  id: string;
  name: string;
  sncfId: string;
  coords: { lat: number; lng: number };
}

// Cache all stations in memory (fetched once from SNCF API)
let cachedStations: StationData[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

async function fetchAllStations(): Promise<StationData[]> {
  const apiKey = process.env.SNCF_API_KEY;
  if (!apiKey) throw new Error("SNCF_API_KEY not configured");

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
      `https://api.sncf.com/v1/coverage/sncf/stop_areas?${params}`,
      { headers: { Authorization: `Basic ${btoa(apiKey + ":")}` } }
    );

    if (!res.ok) break;

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

// GET /api/stations — returns all stations (cached)
// GET /api/stations?lat=X&lng=Y&radius=50 — returns stations near a point
export async function GET(request: NextRequest) {
  // Fetch & cache if needed
  if (!cachedStations || Date.now() - cacheTime > CACHE_TTL) {
    try {
      cachedStations = await fetchAllStations();
      cacheTime = Date.now();
    } catch (e) {
      return Response.json(
        { error: (e as Error).message },
        { status: 500 }
      );
    }
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius");

  // Filter by proximity if lat/lng provided
  if (lat && lng) {
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    const rKm = radius ? parseFloat(radius) : 50;

    const nearby = cachedStations
      .map((s) => {
        const dLat = s.coords.lat - pLat;
        const dLng = s.coords.lng - pLng;
        // Rough distance in km
        const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
        return { ...s, dist };
      })
      .filter((s) => s.dist <= rKm)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20);

    return Response.json({ stations: nearby, total: cachedStations.length });
  }

  // Return count + summary
  return Response.json({
    total: cachedStations.length,
    stations: cachedStations,
  });
}
