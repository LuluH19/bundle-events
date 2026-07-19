import { NextRequest, NextResponse } from "next/server";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";

/**
 * Resolve a city name to a FlixBus city UUID, closest to the leg coordinates.
 * FlixBus' shop search deep-link needs these internal UUIDs (a plain city name
 * won't do), so we resolve them via their public autocomplete server-side.
 */
async function resolveCityId(name: string, lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://global.api.flixbus.com/search/autocomplete/cities?q=${encodeURIComponent(
      name
    )}&lang=fr&country=FR`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      id: string;
      location?: { lat: number; lon: number };
    }[];
    if (!Array.isArray(data) || !data.length) return null;

    const best = data
      .filter(c => c.id && c.location)
      .map(c => ({ id: c.id, d: haversineDistance({ lat, lng }, { lat: c.location!.lat, lng: c.location!.lon }) }))
      .sort((a, b) => a.d - b.d)[0];

    return best?.id ?? null;
  } catch {
    return null;
  }
}

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
    resolveCityId(fromName, fromLat, fromLng),
    resolveCityId(toName, toLat, toLng),
  ]);

  // Fallback: no city UUID -> Google Maps transit itinerary for the same leg.
  if (!departureCity || !arrivalCity) {
    const gmaps = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=transit`;
    return NextResponse.redirect(gmaps);
  }

  // FlixBus wants the ride date as DD.MM.YYYY.
  const toFlixDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  };

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
