import type { Venue } from "@/src/types";
import { searchLocation } from "@/src/services/geocoding";
import { addressVenue } from "@/src/utils/venue-suggestions";

const RECENT_SEARCHES_MAX = 50;
const recentSearches = new Map<string, Venue[]>();
const recentAddresses = new Map<string, Venue[]>();

const searchKey = (query: string) => query.trim().toLowerCase();

function remember(store: Map<string, Venue[]>, key: string, venues: Venue[]) {
  store.set(key, venues);
  if (store.size > RECENT_SEARCHES_MAX) store.delete(store.keys().next().value as string);
}

export function cachedEventSearch(query: string): Venue[] | undefined {
  return recentSearches.get(searchKey(query));
}

export function cachedAddressSearch(query: string): Venue[] | undefined {
  return recentAddresses.get(searchKey(query));
}

export async function searchEvents(query: string, signal?: AbortSignal): Promise<Venue[]> {
  const key = searchKey(query);
  const hit = recentSearches.get(key);
  if (hit) return hit;
  const venues = await fetchVenues({ q: query }, signal);
  remember(recentSearches, key, venues);
  return venues;
}

export async function searchAddresses(query: string): Promise<Venue[]> {
  const key = searchKey(query);
  const hit = recentAddresses.get(key);
  if (hit) return hit;
  const venues = (await searchLocation(query)).map(addressVenue);
  remember(recentAddresses, key, venues);
  return venues;
}

export async function searchEventIdeas(cities: string[], category?: string): Promise<Venue[]> {
  return fetchVenues(category ? { cities: cities.join(","), category } : { cities: cities.join(",") });
}

async function fetchVenues(params: Record<string, string>, signal?: AbortSignal): Promise<Venue[]> {
  const res = await fetch(`/api/events/search?${new URLSearchParams(params)}`, { signal });
  if (!res.ok) throw new Error(`Event search failed: ${res.status}`);
  const data: { venues?: Venue[] } = await res.json();
  return data.venues ?? [];
}
