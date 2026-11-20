import { NextRequest, NextResponse } from "next/server";
import { resolveFlixbusCityId, toFlixDate } from "@/src/lib/flixbus";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const fromName = sp.get("fromName");
  const toName = sp.get("toName");
  const fromLat = Number(sp.get("fromLat"));
  const fromLng = Number(sp.get("fromLng"));
  const toLat = Number(sp.get("toLat"));
  const toLng = Number(sp.get("toLng"));
  const date = sp.get("date"); // YYYY-MM-DD
  const returnDate = sp.get("returnDate");

  if (!fromName || !toName || !date) {
    return NextResponse.json({ error: "fromName, toName and date required" }, { status: 400 });
  }

  const [departureCity, arrivalCity] = await Promise.all([
    resolveFlixbusCityId(fromName, fromLat, fromLng),
    resolveFlixbusCityId(toName, toLat, toLng),
  ]);

  // Fallback: no city UUID -> Google Maps transit itinerary for the same leg.
  if (!departureCity || !arrivalCity) {
    const gmaps = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=transit`;
    return NextResponse.redirect(gmaps);
  }

  const params = new URLSearchParams({
    departureCity,
    arrivalCity,
    rideDate: toFlixDate(date),
    adult: "1",
    _locale: "fr",
    currency: "EUR",
  });
  if (returnDate) params.set("returnDate", toFlixDate(returnDate));

  return NextResponse.redirect(`https://shop.flixbus.com/search?${params}`);
}
