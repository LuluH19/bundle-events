import type { EventProvider, EventSearchCriteria, Venue } from "@/src/types";
import { apiCacheConfig, eventsConfig, mapboxConfig, type ApiProvider } from "@/src/config";
import { cached } from "@/src/lib/api-cache";
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

interface Source {
  name: ApiProvider;
  adapter: EventProvider;
  policy: { ttlMs: number; staleMs: number };
  /** False when the provider has no key: skipped without a cache lookup or usage count. */
  enabled?: () => boolean;
}

const { events: eventPolicy, venues: venuePolicy } = apiCacheConfig.policies;

const eventChain: Source[] = [
  {
    name: "ticketmaster",
    adapter: new TicketmasterEventAdapter(),
    policy: eventPolicy,
    enabled: () => !!eventsConfig.ticketmaster.apiKey,
  },
  { name: "openagenda", adapter: new OpenAgendaEventAdapter(), policy: eventPolicy },
  { name: "opendata-idf", adapter: new OpenDataEventAdapter(), policy: eventPolicy },
];

const venueProviders: Source[] = [
  { name: "mapbox", adapter: new MapboxVenueAdapter(), policy: venuePolicy, enabled: () => !!mapboxConfig.token },
  { name: "nominatim", adapter: new OsmVenueAdapter(), policy: venuePolicy },
];

const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Shared cache per provider (issue #153): a failure still throws, so the chain moves on. */
async function searchSource({ name, adapter, policy, enabled }: Source, criteria: EventSearchCriteria): Promise<Venue[]> {
  if (enabled && !enabled()) return [];
  const key = `events:${normalise(criteria.query)}:${normalise(criteria.city ?? "")}:${criteria.limit ?? ""}`;
  // These adapters throw on failure, so an empty list is a real answer: cache it too,
  // otherwise every query without results (e.g. a venue name used as a city) calls again.
  const { data } = await cached({
    provider: name,
    key,
    ...policy,
    fetcher: () => adapter.searchEvents(criteria),
    shouldStore: () => true,
  });
  return data;
}

const withTitle = (venues: Venue[]): Venue[] => venues.map((v) => ({ ...v, name: capitalizeFirst(v.name) }));

export interface EventSearchResult {
  venues: Venue[];
  eventSource: string | null;
}

export async function searchEventsAndVenues(query: string): Promise<EventSearchResult> {
  const [cityEvents, events, ...venues] = await Promise.allSettled([
    eventsInCity(query.trim(), eventsConfig.defaultLimit),
    firstNonEmpty(eventChain.map((source) => ({ name: source.name, run: () => searchSource(source, { query }) }))),
    ...venueProviders.map((source) => searchSource(source, { query })),
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
    eventChain.map((source) => ({
      name: source.name,
      run: async () => (await searchSource(source, { query: city, city, limit })).filter((v) => isInCity(v, city)),
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

export interface CityEvents {
  city: string;
  events: Venue[];
}

export async function listCityEvents(cities: string[], perCity: number): Promise<CityEvents[]> {
  const lists = await Promise.all(cities.map((c) => eventsInCity(c, perCity).catch(() => [] as Venue[])));
  return cities.map((city, i) => ({ city, events: withTitle(dedupeVenues(lists[i])) }));
}
