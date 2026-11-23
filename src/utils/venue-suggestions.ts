import type { GeocodingResult, Venue } from "@/src/types";
import { dedupeVenues } from "@/src/utils/algorithms/venue-dedupe";

export const ADDRESS_ID_PREFIX = "addr-";
export const VENUE_SUGGESTIONS_MAX = 8;

export function addressVenue(r: GeocodingResult): Venue {
  const name = r.displayName.split(",")[0].trim() || r.address;
  return {
    id: `${ADDRESS_ID_PREFIX}${r.coords.lat.toFixed(5)},${r.coords.lng.toFixed(5)}`,
    name,
    address: r.address || r.displayName,
    coords: r.coords,
    city: "",
  };
}

export function mergeVenueSuggestions(events: Venue[], addresses: Venue[], max = VENUE_SUGGESTIONS_MAX): Venue[] {
  return dedupeVenues([...events, ...addresses]).slice(0, max);
}
