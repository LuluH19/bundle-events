import { NextRequest } from "next/server";

interface HotelResult {
  id: string;
  name: string;
  locationName: string;
  coords: { lat: number; lng: number };
  stars?: number;
  website?: string;
  phone?: string;
  type?: string;
  photo?: string;
  pricePerNight?: number;
  currency?: string;
  rating?: number;
  source: "liteapi" | "overpass";
}

// ---- Caches ----
const overpassCache = new Map<string, { data: HotelResult[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
let lastOverpassTime = 0;

async function rateLimitedOverpass(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = 2000 - (now - lastOverpassTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastOverpassTime = Date.now();
  return fetch(url, options);
}

// ---- Overpass (OSM) ----
async function searchOverpass(lat: string, lng: string, radiusKm: string): Promise<HotelResult[]> {
  const cacheKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)},${radiusKm}`;
  const cached = overpassCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const radiusMeters = Number(radiusKm) * 1000;
  const query = `[out:json][timeout:15];(nwr["tourism"="hotel"](around:${radiusMeters},${lat},${lng});nwr["tourism"="hostel"](around:${radiusMeters},${lat},${lng});nwr["tourism"="guest_house"](around:${radiusMeters},${lat},${lng}););out center 30;`;

  const res = await rateLimitedOverpass("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!res.ok) {
    if (cached) return cached.data;
    return [];
  }

  const data = await res.json();
  const hotels: HotelResult[] = (data.elements || [])
    .filter((el: { tags?: { name?: string } }) => el.tags?.name)
    .map((el: { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      const tags = el.tags;
      const addr = [tags["addr:housenumber"], tags["addr:street"], tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
      return {
        id: `osm-${el.id}`,
        name: tags.name,
        locationName: addr,
        coords: { lat: elLat!, lng: elLng! },
        stars: tags.stars ? Number(tags.stars) : undefined,
        website: tags.website || tags["contact:website"] || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        type: tags.tourism,
        source: "overpass" as const,
      };
    })
    .filter((h: HotelResult) => h.coords.lat && h.coords.lng);

  overpassCache.set(cacheKey, { data: hotels, ts: Date.now() });
  return hotels;
}

// ---- LiteAPI ----
async function searchLiteAPI(lat: string, lng: string, radiusKm: string, checkin: string, checkout: string): Promise<HotelResult[]> {
  const apiKey = process.env.LITEAPI_KEY || "sand_c0155ab8-c683-4f26-8f94-b5e92c5797b9";

  try {
    const res = await fetch("https://api.liteapi.travel/v3.0/hotels/rates", {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: Number(lat),
        longitude: Number(lng),
        radius: Number(radiusKm) * 1000,
        occupancies: [{ adults: 2 }],
        currency: "EUR",
        guestNationality: "FR",
        checkin,
        checkout,
        limit: 20,
        sort: "price",
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data?.length) return [];

    // Fetch hotel details for each result
    const hotelIds: string[] = data.data.map((h: { hotelId: string }) => h.hotelId);
    const details = await fetchHotelDetails(apiKey, hotelIds);

    return data.data.map((h: { hotelId: string; roomTypes?: { offerRetailRate?: { amount?: number }; rates?: { retailRate?: { total?: { amount?: number; currency?: string }[] } }[] }[] }) => {
      const detail = details.get(h.hotelId);
      // Find cheapest rate
      let price: number | undefined;
      let currency = "EUR";
      for (const rt of h.roomTypes || []) {
        if (rt.offerRetailRate?.amount) {
          const p = Number(rt.offerRetailRate.amount);
          if (!price || p < price) { price = p; currency = "EUR"; }
        }
        for (const rate of rt.rates || []) {
          const total = rate.retailRate?.total?.[0];
          if (total?.amount) {
            const p = Number(total.amount);
            if (!price || p < price) { price = p; currency = total.currency || "EUR"; }
          }
        }
      }

      return {
        id: `lite-${h.hotelId}`,
        name: detail?.name || h.hotelId,
        locationName: detail?.address || detail?.city || "",
        coords: { lat: detail?.latitude || Number(lat), lng: detail?.longitude || Number(lng) },
        stars: detail?.starRating,
        photo: detail?.main_photo,
        pricePerNight: price ? Math.round(price / getDaysDiff(checkin, checkout)) : undefined,
        currency,
        rating: detail?.rating,
        type: "hotel",
        source: "liteapi" as const,
      };
    }).filter((h: HotelResult) => h.name !== h.id.replace("lite-", ""));
  } catch {
    return [];
  }
}

async function fetchHotelDetails(apiKey: string, hotelIds: string[]): Promise<Map<string, { name: string; address: string; city: string; latitude: number; longitude: number; starRating: number; main_photo: string; rating: number }>> {
  const map = new Map();
  // Fetch in parallel (max 5 concurrent)
  const chunks = [];
  for (let i = 0; i < hotelIds.length; i += 5) {
    chunks.push(hotelIds.slice(i, i + 5));
  }
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (id) => {
        try {
          const res = await fetch(`https://api.liteapi.travel/v3.0/data/hotel?hotelId=${id}`, {
            headers: { "X-API-Key": apiKey },
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { id, detail: data.data };
        } catch { return null; }
      })
    );
    for (const r of results) {
      if (r?.detail) map.set(r.id, r.detail);
    }
  }
  return map;
}

function getDaysDiff(checkin: string, checkout: string): number {
  const d1 = new Date(checkin);
  const d2 = new Date(checkout);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

// ---- Deduplication ----
function deduplicateHotels(liteapi: HotelResult[], overpass: HotelResult[]): HotelResult[] {
  const result: HotelResult[] = [...liteapi];
  const usedCoords = new Set(liteapi.map(h => `${h.coords.lat.toFixed(4)},${h.coords.lng.toFixed(4)}`));

  for (const osmHotel of overpass) {
    const coordKey = `${osmHotel.coords.lat.toFixed(4)},${osmHotel.coords.lng.toFixed(4)}`;
    // Skip if a LiteAPI hotel is at the same coordinates (~11m precision)
    if (usedCoords.has(coordKey)) continue;

    // Check name similarity with nearby LiteAPI hotels
    const isDuplicate = liteapi.some(lh => {
      const dist = Math.sqrt(
        Math.pow((lh.coords.lat - osmHotel.coords.lat) * 111000, 2) +
        Math.pow((lh.coords.lng - osmHotel.coords.lng) * 111000 * Math.cos(lh.coords.lat * Math.PI / 180), 2)
      );
      if (dist > 200) return false; // >200m apart = different
      // Normalize names and check similarity
      const n1 = lh.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const n2 = osmHotel.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return n1.includes(n2) || n2.includes(n1) || n1 === n2;
    });

    if (!isDuplicate) {
      result.push(osmHotel);
    }
  }

  return result;
}

// ---- Route handler ----
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radiusKm = request.nextUrl.searchParams.get("radius") || "10";
  const checkin = request.nextUrl.searchParams.get("checkin");
  const checkout = request.nextUrl.searchParams.get("checkout");

  if (!lat || !lng) {
    return Response.json({ error: "lat and lng required" }, { status: 400 });
  }

  // Fetch from both sources in parallel
  const [liteapiResults, overpassResults] = await Promise.all([
    checkin && checkout
      ? searchLiteAPI(lat, lng, radiusKm, checkin, checkout)
      : Promise.resolve([]),
    searchOverpass(lat, lng, radiusKm),
  ]);

  // Deduplicate: LiteAPI hotels take priority (they have prices)
  const hotels = deduplicateHotels(liteapiResults, overpassResults);

  // Sort: hotels with prices first, then by stars
  hotels.sort((a, b) => {
    if (a.pricePerNight && !b.pricePerNight) return -1;
    if (!a.pricePerNight && b.pricePerNight) return 1;
    return (b.stars || 0) - (a.stars || 0);
  });

  return Response.json(hotels);
}
