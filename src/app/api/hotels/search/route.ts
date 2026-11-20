import { NextRequest } from "next/server";
import { LiteApiHotelAdapter, OverpassHotelAdapter } from "@/src/adapters/hotels";
import { apiCacheConfig, overpassConfig } from "@/src/config";
import { cached, peek, prime, type CacheStatus } from "@/src/lib/api-cache";
import type { HotelMapItem } from "@/src/types";

const liteapi = new LiteApiHotelAdapter();
const overpass = new OverpassHotelAdapter();

// ~110 m: users searching the same venue share one cache entry.
const round = (v: string) => Number(v).toFixed(3);

/**
 * Fallback chain, all without price beyond step 1 (the UI shows "Prix indisponible"):
 * 1. LiteAPI rates for these dates (fresh, cached, or stale copy);
 * 2. hotels LiteAPI last returned around this venue for any dates (no upstream call);
 * 3. OpenStreetMap hotels via Overpass (slow public instances, cached 7 days);
 * 4. empty list.
 * `X-Data-Source` and `X-Cache` headers tell which step answered.
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radiusKm = request.nextUrl.searchParams.get("radius") || "10";
  const checkin = request.nextUrl.searchParams.get("checkin");
  const checkout = request.nextUrl.searchParams.get("checkout");

  if (!lat || !lng) {
    return Response.json({ error: "lat and lng required" }, { status: 400 });
  }
  if (!checkin || !checkout) {
    return Response.json({ error: "checkin and checkout required" }, { status: 400 });
  }

  const rLat = round(lat);
  const rLng = round(lng);

  const venueKey = `venue:${rLat}:${rLng}`;
  const { venueHotels } = apiCacheConfig.policies;

  try {
    const { data, status } = await cached({
      provider: "liteapi",
      key: `rates:${rLat}:${rLng}:${radiusKm}:${checkin}:${checkout}`,
      ...apiCacheConfig.policies.hotelRates,
      fetcher: () => liteapi.searchHotels({ lat: rLat, lng: rLng, radiusKm, checkin, checkout }),
    });
    if (data.length) {
      const sorted = [...data].sort((a, b) => (a.pricePerNight ?? Infinity) - (b.pricePerNight ?? Infinity));
      if (status === "miss") void prime("liteapi", venueKey, withoutPrices(sorted), venueHotels.ttlMs).catch(() => {});
      return respond(sorted, "liteapi", status);
    }
  } catch {
    // LiteAPI down, over quota or circuit open, with nothing cached for these dates.
  }

  const known = await peek<HotelMapItem[]>("liteapi", venueKey, venueHotels.staleMs);
  if (known?.length) return respond(known, "liteapi-venue", "stale");

  const osmRadius = String(Math.min(Number(radiusKm) || 10, overpassConfig.maxRadiusKm));
  try {
    const { data, status } = await cached({
      provider: "overpass",
      key: `hotels:${rLat}:${rLng}:${osmRadius}`,
      ...apiCacheConfig.policies.osmHotels,
      fetcher: () => overpass.searchHotels({ lat: rLat, lng: rLng, radiusKm: osmRadius }),
    });
    return respond(data, "overpass", status);
  } catch {
    return respond([], "none", "miss");
  }
}

function respond(hotels: HotelMapItem[], source: string, status: CacheStatus) {
  return Response.json(hotels, { headers: { "X-Data-Source": source, "X-Cache": status } });
}

// Rates depend on dates: only the hotel itself (name, photo, coords, rating) is reusable.
function withoutPrices(hotels: HotelMapItem[]): HotelMapItem[] {
  return hotels.map((h) => ({ ...h, pricePerNight: undefined, currency: undefined }));
}
