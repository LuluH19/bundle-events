import { bundlesConfig } from "@/src/config";
import type { BundleSnapshot } from "@/src/types";

/**
 * Validates the `data` sent to POST /api/bundles and PATCH /api/bundles/[uuid] (issue #196).
 *
 * Top-level keys must be known `BundleSnapshot` fields, all optional. Objects built by the
 * client (locations, `booked`) are strict. Objects that come from our own APIs (route options,
 * hotels) have their known fields type-checked but may carry extra keys, so a new adapter field
 * does not break autosave; those extra values stay bounded (string length, array length, depth).
 */

type Check = (value: unknown, path: string, depth: number) => string | null;

const { maxStringLength, maxSegmentsPerRoute, maxPointsPerSegment, maxDepth } = bundlesConfig;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str =
  (max: number = maxStringLength): Check =>
  (v, path) =>
    typeof v !== "string" ? `${path} must be a string` : v.length > max ? `${path} is too long` : null;

/** JSON turns NaN/Infinity into null: accept it rather than silently breaking autosave. */
const num: Check = (v, path) => (v === null || typeof v === "number" ? null : `${path} must be a number`);

const bool: Check = (v, path) => (typeof v === "boolean" ? null : `${path} must be a boolean`);

const oneOf =
  (...values: string[]): Check =>
  (v, path) =>
    typeof v === "string" && values.includes(v) ? null : `${path} must be one of ${values.join(", ")}`;

const nullable =
  (check: Check): Check =>
  (v, path, depth) =>
    v === null ? null : check(v, path, depth);

const arrayOf =
  (item: Check, max: number): Check =>
  (v, path, depth) => {
    if (!Array.isArray(v)) return `${path} must be an array`;
    if (v.length > max) return `${path} has too many items`;
    for (let i = 0; i < v.length; i++) {
      const err = item(v[i], `${path}[${i}]`, depth + 1);
      if (err) return err;
    }
    return null;
  };

/** Any JSON value, bounded: used for extra keys on API-built objects. */
const bounded: Check = (v, path, depth) => {
  if (depth > maxDepth) return `${path} is nested too deeply`;
  if (v === null || typeof v === "number" || typeof v === "boolean") return null;
  if (typeof v === "string") return str()(v, path, depth);
  if (Array.isArray(v)) return arrayOf(bounded, maxPointsPerSegment)(v, path, depth);
  if (isPlainObject(v)) {
    for (const [k, child] of Object.entries(v)) {
      if (k.length > 100) return `${path} has a key that is too long`;
      const err = bounded(child, `${path}.${k}`, depth + 1);
      if (err) return err;
    }
    return null;
  }
  return `${path} has an unsupported value`;
};

type Shape = Record<string, { check: Check; optional?: boolean }>;
const req = (check: Check) => ({ check });
const opt = (check: Check) => ({ check, optional: true });

const object =
  (shape: Shape, { extraKeys = false } = {}): Check =>
  (v, path, depth) => {
    if (depth > maxDepth) return `${path} is nested too deeply`;
    if (!isPlainObject(v)) return `${path} must be an object`;
    for (const [key, { check, optional }] of Object.entries(shape)) {
      const value = v[key];
      if (value === undefined || (optional && value === null)) {
        if (optional) continue;
        return `${path}.${key} is required`;
      }
      const err = check(value, `${path}.${key}`, depth + 1);
      if (err) return err;
    }
    for (const key of Object.keys(v)) {
      if (key in shape) continue;
      if (!extraKeys) return `${path}.${key} is not allowed`;
      const err = bounded(v[key], `${path}.${key}`, depth + 1);
      if (err) return err;
    }
    return null;
  };

const TRANSPORT_MODES = ["car", "train", "plane", "bus", "walking"];

const latLng = object({ lat: req(num), lng: req(num) });

const point: Check = (v, path) =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number") ? null : `${path} must be [lat, lng]`;

const location = object({
  id: req(str()),
  name: req(str()),
  coords: req(latLng),
  type: req(oneOf("departure", "hotel", "venue")),
  address: opt(str()),
  iataCode: opt(str()),
  sncfId: opt(str()),
});

const place = object({ name: req(str()), coords: req(latLng) }, { extraKeys: true });

const segment = object(
  {
    from: req(place),
    to: req(place),
    mode: req(oneOf(...TRANSPORT_MODES)),
    coordinates: req(arrayOf(point, maxPointsPerSegment)),
    distanceKm: req(num),
    durationMinutes: req(num),
    color: opt(str()),
    label: opt(str()),
    departureTime: opt(str()),
    arrivalTime: opt(str()),
    waitTimeMinutes: opt(num),
  },
  { extraKeys: true }
);

const priceQuote = object(
  {
    amount: req(num),
    max: opt(num),
    source: req(oneOf("live", "tariff", "estimate")),
    provider: opt(str()),
    extras: opt(num),
  },
  { extraKeys: true }
);

const routeOption = object(
  {
    id: req(str()),
    mode: req(oneOf(...TRANSPORT_MODES)),
    accessMode: opt(oneOf(...TRANSPORT_MODES)),
    route: req(
      object(
        {
          segments: req(arrayOf(segment, maxSegmentsPerRoute)),
          totalDistanceKm: req(num),
          totalDurationMinutes: req(num),
          isMultimodal: req(bool),
          transports: opt(num),
          transportsByMode: opt(
            object(Object.fromEntries(TRANSPORT_MODES.map((m) => [m, opt(num)])))
          ),
        },
        { extraKeys: true }
      )
    ),
    durationMin: req(num),
    distanceKm: req(num),
    price: req(num),
    quote: opt(priceQuote),
    modeQuotes: opt(object({ plane: opt(priceQuote), train: opt(priceQuote), bus: opt(priceQuote) })),
  },
  { extraKeys: true }
);

const hotel = object(
  {
    id: req(str()),
    name: req(str()),
    locationName: req(str()),
    coords: req(latLng),
    stars: opt(num),
    website: opt(str()),
    phone: opt(str()),
    type: opt(str()),
    photo: opt(str()),
    pricePerNight: opt(num),
    currency: opt(str()),
    rating: opt(num),
    refundable: opt(bool),
    freeCancellationUntil: opt(str()),
    board: opt(str()),
    source: opt(oneOf("liteapi", "overpass")),
  },
  { extraKeys: true }
);

const shortStr = str(40);

const snapshot = object({
  departure: opt(nullable(location)),
  venue: opt(nullable(location)),
  checkin: opt(shortStr),
  checkout: opt(shortStr),
  roundTrip: opt(bool),
  outboundOption: opt(nullable(routeOption)),
  returnOption: opt(nullable(routeOption)),
  selectedHotel: opt(nullable(hotel)),
  hotelOptIn: opt(bool),
  preference: opt(nullable(oneOf("fast", "cheap", "green"))),
  arriveBy: opt(shortStr),
  leaveAfter: opt(shortStr),
  booked: opt(object({ outbound: opt(bool), hotel: opt(bool), return: opt(bool) })),
});

export type BundleValidation = { ok: true; data: Partial<BundleSnapshot> } | { ok: false; error: string };

export function validateBundleData(data: unknown): BundleValidation {
  if (!isPlainObject(data)) return { ok: false, error: "data is required" };
  const error = snapshot(data, "data", 0);
  return error ? { ok: false, error } : { ok: true, data: data as Partial<BundleSnapshot> };
}
