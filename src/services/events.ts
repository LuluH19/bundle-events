import { EventProvider, Venue } from "@/src/types";
import { OpenDataEventAdapter, MapboxVenueAdapter, OsmVenueAdapter } from "@/src/adapters/events";
import { dedupeVenues, rankVenues } from "@/src/utils/algorithms/venue-dedupe";

// Order matters: live events, then Mapbox POIs, then OpenStreetMap.
const providers: EventProvider[] = [
  new OpenDataEventAdapter(),
  new MapboxVenueAdapter(),
  new OsmVenueAdapter(),
];

/** Merges all sources, drops duplicates of the same place, ranks by name relevance, and tolerates a source failing. */
export async function searchEvents(query: string): Promise<Venue[]> {
  const settled = await Promise.allSettled(providers.map((p) => p.searchEvents({ query })));
  return rankVenues(
    dedupeVenues(settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []))),
    query
  );
}
