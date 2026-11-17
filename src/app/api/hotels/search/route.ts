import { NextRequest } from "next/server";
import { LiteApiHotelAdapter, OverpassHotelAdapter } from "@/src/adapters/hotels";
import { firstNonEmpty } from "@/src/utils/fallback";

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

  const criteria = { lat, lng, radiusKm, checkin, checkout };
  const { source, value: hotels } = await firstNonEmpty([
    { name: "liteapi", run: () => new LiteApiHotelAdapter().searchHotels(criteria) },
    { name: "overpass", run: () => new OverpassHotelAdapter().searchHotels(criteria) },
  ]);

  hotels.sort((a, b) => (a.pricePerNight ?? Infinity) - (b.pricePerNight ?? Infinity));

  return Response.json(hotels, { headers: { "X-Data-Source": source ?? "none" } });
}
