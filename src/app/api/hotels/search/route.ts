import { NextRequest } from "next/server";
import { LiteApiHotelAdapter } from "@/src/adapters/hotels";

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

  const liteapiAdapter = new LiteApiHotelAdapter();
  const hotels = await liteapiAdapter.searchHotels({ lat, lng, radiusKm, checkin, checkout });

  hotels.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));

  return Response.json(hotels);
}
