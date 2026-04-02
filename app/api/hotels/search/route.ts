import { NextRequest } from "next/server";

// In-memory cache: key = "lat,lng,radius" → { data, timestamp }
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let lastRequestTime = 0;
const MIN_INTERVAL = 2000; // 2s between Overpass calls

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastRequestTime);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestTime = Date.now();
  return fetch(url, options);
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radiusKm = request.nextUrl.searchParams.get("radius") || "10";

  if (!lat || !lng) {
    return Response.json({ error: "lat and lng required" }, { status: 400 });
  }

  // Round coords to 3 decimals for cache key (~100m precision)
  const cacheKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)},${radiusKm}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  const radiusMeters = Number(radiusKm) * 1000;

  const query = `
    [out:json][timeout:15];
    (
      nwr["tourism"="hotel"](around:${radiusMeters},${lat},${lng});
      nwr["tourism"="hostel"](around:${radiusMeters},${lat},${lng});
      nwr["tourism"="guest_house"](around:${radiusMeters},${lat},${lng});
    );
    out center 30;
  `;

  const res = await rateLimitedFetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (res.status === 429) {
    // Return cached data if available (even if stale), otherwise empty
    if (cached) {
      return Response.json(cached.data);
    }
    return Response.json([]);
  }

  if (!res.ok) {
    return Response.json({ error: `Overpass error: ${res.status}` }, { status: res.status });
  }

  const data = await res.json();

  const hotels = (data.elements || [])
    .filter((el: { tags?: { name?: string } }) => el.tags?.name)
    .map((el: { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      const tags = el.tags;

      const addressParts = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:postcode"],
        tags["addr:city"],
      ].filter(Boolean);

      return {
        id: String(el.id),
        name: tags.name,
        locationName: addressParts.join(" ") || "",
        stars: tags.stars ? Number(tags.stars) : undefined,
        type: tags.tourism,
        website: tags.website || tags["contact:website"] || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        priceRange: tags.price_range || undefined,
        coords: { lat: elLat, lng: elLng },
      };
    })
    .filter((h: { coords: { lat?: number; lng?: number } }) => h.coords.lat && h.coords.lng);

  // Store in cache
  cache.set(cacheKey, { data: hotels, ts: Date.now() });

  return Response.json(hotels);
}
