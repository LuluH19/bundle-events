import { Location, LatLng, RouteOption, RouteSegment, TransportMode } from "@/src/types";
import { airports } from "@/src/utils/constants/airports";
import { findNearest } from "@/src/utils/travel";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";
import { dateOnly } from "@/src/utils/date";

/**
 * A "réserver ce trajet" deep-link resolved from the data available on the
 * bundle page. `external: true` links open the provider directly (we can build
 * them from local data). `external: false` links point to an internal
 * /api/booking/* route that resolves a provider-specific station/city id
 * server-side, then 302-redirects to the pre-filled booking page.
 */
export interface BookingLink {
  href: string;
  provider: string;
  external: boolean;
  mode: TransportMode;
  roundTrip?: boolean;
}

export interface HotelBookingLink {
  href: string;
  provider: string;
  external: boolean;
}

const coordStr = (c: LatLng) => `${c.lat},${c.lng}`;

/** Order buttons appear in — mirrors the card's "Avion + Train" mode summary. */
const BOOKABLE_ORDER: TransportMode[] = ["plane", "train", "bus", "car", "walking"];

function proxyParams(seg: RouteSegment, date: string, returnDate?: string): URLSearchParams {
  const p = new URLSearchParams({
    fromName: seg.from.name,
    fromLat: String(seg.from.coords.lat),
    fromLng: String(seg.from.coords.lng),
    toName: seg.to.name,
    toLat: String(seg.to.coords.lat),
    toLng: String(seg.to.coords.lng),
    date,
  });
  if (returnDate) p.set("returnDate", returnDate);
  return p;
}

/**
 * Build the booking link for a single leg segment of a given mode.
 * `returnDate` (plane, train and bus) turns the search into a round-trip one.
 */
function segmentLink(mode: TransportMode, seg: RouteSegment, date: string, returnDate?: string): BookingLink | null {
  switch (mode) {
    case "plane": {
      // Kayak pre-fills reliably from IATA codes; resolve the nearest airport.
      const depA = findNearest(seg.from.coords, airports);
      const arrA = findNearest(seg.to.coords, airports);
      const known =
        haversineDistance(seg.from.coords, depA.coords) < 80 &&
        haversineDistance(seg.to.coords, arrA.coords) < 80 &&
        depA.iataCode !== arrA.iataCode;
      if (known) {
        // Round-trip flights are booked in one search (out + return dates).
        const path = returnDate
          ? `${depA.iataCode}-${arrA.iataCode}/${date}/${returnDate}`
          : `${depA.iataCode}-${arrA.iataCode}/${date}`;
        return { href: `https://www.kayak.com/flights/${path}`, provider: "Kayak", external: true, mode, roundTrip: !!returnDate };
      }
      // No known airport nearby -> Google Flights text search (free, no key).
      const q = encodeURIComponent(
        `Flights from ${seg.from.name} to ${seg.to.name} on ${date}${returnDate ? ` returning ${returnDate}` : ""}`
      );
      return { href: `https://www.google.com/travel/flights?q=${q}`, provider: "Google Flights", external: true, mode, roundTrip: !!returnDate };
    }

    case "train":
      return { href: `/api/booking/train?${proxyParams(seg, date, returnDate)}`, provider: "Trainline", external: false, mode, roundTrip: !!returnDate };

    case "bus":
      return { href: `/api/booking/bus?${proxyParams(seg, date, returnDate)}`, provider: "FlixBus", external: false, mode, roundTrip: !!returnDate };

    case "car":
    case "walking": {
      const p = new URLSearchParams({
        api: "1",
        origin: coordStr(seg.from.coords),
        destination: coordStr(seg.to.coords),
        travelmode: mode === "walking" ? "walking" : "driving",
      });
      return { href: `https://www.google.com/maps/dir/?${p}`, provider: "Google Maps", external: true, mode };
    }
  }
  return null;
}

/**
 * One booking link per transport mode present in the leg — so a multimodal
 * "Avion + Train" trajet yields a button for the plane AND a button for the
 * train. Access-only road/walk segments are ignored unless the whole leg is a
 * road/walk trip. `dateISO` is the departure date for this leg.
 */
export function getBookingLinks(
  option: RouteOption,
  dep: Location | null,
  arr: Location | null,
  dateISO: string,
  opts?: { returnDateISO?: string }
): BookingLink[] {
  if (!dateISO) return [];
  const date = dateOnly(dateISO);
  const returnDate = opts?.returnDateISO ? dateOnly(opts.returnDateISO) : undefined;
  const segments = option.route.segments;
  const links: BookingLink[] = [];

  for (const mode of BOOKABLE_ORDER) {
    const segs = segments.filter(s => s.mode === mode);
    if (!segs.length) continue;
    // car/walking are usually just access legs — only expose them when the
    // whole trajet is that mode (a pure road / walking trip).
    if ((mode === "car" || mode === "walking") && option.mode !== mode) continue;

    // Representative segment = the longest of this mode (the main leg).
    const seg = segs.reduce((a, b) => (b.distanceKm > a.distanceKm ? b : a));
    const rt = mode === "car" || mode === "walking" ? undefined : returnDate;
    const link = segmentLink(mode, seg, date, rt);
    if (link) links.push(link);
  }

  // Nothing bookable resolved -> fall back to a whole-trip driving itinerary.
  if (!links.length && dep && arr) {
    const p = new URLSearchParams({
      api: "1",
      origin: coordStr(dep.coords),
      destination: coordStr(arr.coords),
      travelmode: "driving",
    });
    links.push({ href: `https://www.google.com/maps/dir/?${p}`, provider: "Google Maps", external: true, mode: "car" });
  }

  return links;
}

function setBookingDate(p: URLSearchParams, kind: "checkin" | "checkout", iso: string) {
  const [y, m, d] = dateOnly(iso).split("-");
  if (!y || !m || !d) return;
  p.set(`${kind}_year`, y);
  p.set(`${kind}_month`, String(Number(m)));
  p.set(`${kind}_monthday`, String(Number(d)));
}

export function getHotelBookingLink(
  hotel: { name: string; locationName?: string },
  checkinISO: string,
  checkoutISO: string,
  opts?: { adults?: number }
): HotelBookingLink {
  const city = hotel.locationName?.split(",").pop()?.trim();
  const p = new URLSearchParams({
    ss: [hotel.name, city].filter(Boolean).join(" "),
    group_adults: String(opts?.adults ?? 2),
    group_children: "0",
    no_rooms: "1",
    lang: "fr",
    selected_currency: "EUR",
  });
  if (checkinISO) setBookingDate(p, "checkin", checkinISO);
  if (checkoutISO) setBookingDate(p, "checkout", checkoutISO);
  return { href: `https://www.booking.com/searchresults.html?${p}`, provider: "Booking.com", external: true };
}
