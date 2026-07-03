import { NextRequest } from "next/server";
import { LiteApiHotelAdapter, OverpassHotelAdapter } from "@/src/adapters/hotels";
import { deduplicateHotels } from "@/src/utils/hotel";

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

  const liteapiAdapter = new LiteApiHotelAdapter();
  const overpassAdapter = new OverpassHotelAdapter();

  // Fetch from both sources in parallel using the adapter interface
  const [liteapiResults, overpassResults] = await Promise.all([
    checkin && checkout
      ? liteapiAdapter.searchHotels({ lat, lng, radiusKm, checkin, checkout })
      : Promise.resolve([]),
    overpassAdapter.searchHotels({ lat, lng, radiusKm }),
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
