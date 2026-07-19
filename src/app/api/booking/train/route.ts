import { NextRequest, NextResponse } from "next/server";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";

/**
 * Resolve a station/city name to a Trainline location URN, picking the candidate
 * closest to the coordinates we already have for the leg. Trainline's booking
 * deep-link (/book/results) needs these proprietary URNs — they aren't derivable
 * from a plain station name, so we look them up server-side (avoids CORS too).
 */
async function resolveUrn(name: string, lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://www.thetrainline.com/api/locations-search/v2/search?searchTerm=${encodeURIComponent(
      name
    )}&locale=fr-FR`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      searchLocations?: { code: string; latitude: number; longitude: number; locationType?: string }[];
    };
    const locs = (data.searchLocations || []).filter(l => l.code?.startsWith("urn:trainline:generic:loc:"));
    if (!locs.length) return null;

    // Prefer the geographically closest match to our known coordinates.
    const best = locs
      .map(l => ({ code: l.code, d: haversineDistance({ lat, lng }, { lat: l.latitude, lng: l.longitude }) }))
      .sort((a, b) => a.d - b.d)[0];

    return best?.code ?? null;
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

  const [origin, destination] = await Promise.all([
    resolveUrn(fromName, fromLat, fromLng),
    resolveUrn(toName, toLat, toLng),
  ]);

  // Fallback: no URN resolved -> Google Maps transit itinerary for the same leg.
  if (!origin || !destination) {
    const gmaps = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=transit`;
    return NextResponse.redirect(gmaps);
  }

  const params = new URLSearchParams({
    journeySearchType: returnDate ? "return" : "single",
    origin,
    destination,
    outwardDate: `${date}T08:00:00`,
    outwardDateType: "departAfter",
    selectedTab: "train",
    lang: "fr",
  });
  if (returnDate) {
    params.set("inwardDate", `${returnDate}T08:00:00`);
    params.set("inwardDateType", "departAfter");
  }

  return NextResponse.redirect(`https://www.thetrainline.com/book/results?${params}`);
}
