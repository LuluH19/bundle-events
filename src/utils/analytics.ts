export type VenueProvider = "ticketmaster" | "mapbox" | "osm" | "opendata";

const PREFIXES: [string, VenueProvider][] = [
  ["tm-", "ticketmaster"],
  ["poi-", "mapbox"],
  ["osm-", "osm"],
];

/** Infers the event provider from the id prefix set by `src/adapters/events`. */
export function venueProvider(id: string): VenueProvider {
  return PREFIXES.find(([prefix]) => id.startsWith(prefix))?.[1] ?? "opendata";
}
