import { NextRequest, NextResponse } from "next/server";
import { resolveTrainlineUrn } from "@/src/lib/trainline";

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
    resolveTrainlineUrn(fromName, fromLat, fromLng),
    resolveTrainlineUrn(toName, toLat, toLng),
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
