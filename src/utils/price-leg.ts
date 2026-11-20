import type { PriceLeg } from "@/src/types";

export function readPriceLeg(sp: URLSearchParams): PriceLeg | null {
  const fromName = sp.get("fromName");
  const toName = sp.get("toName");
  const datetime = sp.get("datetime");
  const coords = ["fromLat", "fromLng", "toLat", "toLng"].map((k) => Number(sp.get(k)));
  if (!fromName || !toName || !datetime || !/^\d{4}-\d{2}-\d{2}/.test(datetime) || !coords.every(Number.isFinite)) return null;
  const [fromLat, fromLng, toLat, toLng] = coords;
  return {
    from: { name: fromName, coords: { lat: fromLat, lng: fromLng } },
    to: { name: toName, coords: { lat: toLat, lng: toLng } },
    datetime,
  };
}

export function priceLegParams(leg: PriceLeg): URLSearchParams {
  return new URLSearchParams({
    fromName: leg.from.name,
    fromLat: String(leg.from.coords.lat),
    fromLng: String(leg.from.coords.lng),
    toName: leg.to.name,
    toLat: String(leg.to.coords.lat),
    toLng: String(leg.to.coords.lng),
    datetime: leg.datetime,
  });
}

/** Cache key: ~100 m precision on both ends, departure rounded to the hour. */
export const priceLegKey = (leg: PriceLeg) =>
  [leg.from.coords.lat, leg.from.coords.lng, leg.to.coords.lat, leg.to.coords.lng]
    .map((n) => n.toFixed(3))
    .concat(leg.datetime.slice(0, 13))
    .join("|");

export const PRICE_LEG_ERROR = "fromName, fromLat, fromLng, toName, toLat, toLng and datetime required";
