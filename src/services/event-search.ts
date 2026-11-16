import type { Venue } from "@/src/types";
import { eventsConfig } from "@/src/config";
import {
  MapboxVenueAdapter,
  OpenAgendaEventAdapter,
  OpenDataEventAdapter,
  OsmVenueAdapter,
  TicketmasterEventAdapter,
} from "@/src/adapters/events";
import { firstNonEmpty } from "@/src/utils/fallback";
import { capitalizeFirst } from "@/src/utils/format";
import { dedupeVenues, isInCity, rankVenues } from "@/src/utils/algorithms/venue-dedupe";

const eventChain = [
  { name: "ticketmaster", adapter: new TicketmasterEventAdapter() },
  { name: "openagenda", adapter: new OpenAgendaEventAdapter() },
  { name: "opendata-idf", adapter: new OpenDataEventAdapter() },
];

const venueProviders = [new MapboxVenueAdapter(), new OsmVenueAdapter()];

const withTitle = (venues: Venue[]): Venue[] => venues.map((v) => ({ ...v, name: capitalizeFirst(v.name) }));

export interface EventSearchResult {
  venues: Venue[];
  eventSource: string | null;
}

export async function searchEventsAndVenues(query: string): Promise<EventSearchResult> {
  const [cityEvents, events, ...venues] = await Promise.allSettled([
    eventsInCity(query.trim(), eventsConfig.defaultLimit),
    firstNonEmpty(eventChain.map(({ name, adapter }) => ({ name, run: () => adapter.searchEvents({ query }) }))),
    ...venueProviders.map((p) => p.searchEvents({ query })),
  ]);
  const inCity = cityEvents.status === "fulfilled" ? cityEvents.value : [];
  const eventResult = events.status === "fulfilled" ? events.value : { source: null, value: [] };
  const places = venues.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return {
    venues: withTitle(dedupeVenues([...inCity, ...rankVenues(dedupeVenues([...eventResult.value, ...places]), query)])),
    eventSource: eventResult.source,
  };
}

async function eventsInCity(city: string, limit: number): Promise<Venue[]> {
  const { value } = await firstNonEmpty(
    eventChain.map(({ name, adapter }) => ({
      name,
      run: async () => (await adapter.searchEvents({ query: city, city, limit })).filter((v) => isInCity(v, city)),
    }))
  );
  return value;
}

export function interleave<T>(lists: T[][], max: number): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) {
    for (const list of lists) {
      if (i < list.length && out.length < max) out.push(list[i]);
    }
  }
  return out;
}

export async function searchEventIdeas(cities: string[]): Promise<Venue[]> {
  const max = eventsConfig.ideasLimit;
  const perCity = cities.length > 1 ? Math.max(2, Math.ceil(max / cities.length)) : max;
  const lists = await Promise.all(cities.map((c) => eventsInCity(c, perCity).catch(() => [])));
  return withTitle(dedupeVenues(interleave(lists, max)));
}
