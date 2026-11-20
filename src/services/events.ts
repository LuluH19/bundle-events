import type { Venue } from "@/src/types";

const RECENT_SEARCHES_MAX = 50;
const recentSearches = new Map<string, Venue[]>();

export function cachedEventSearch(query: string): Venue[] | undefined {
  return recentSearches.get(query.trim().toLowerCase());
}

export async function searchEvents(query: string, signal?: AbortSignal): Promise<Venue[]> {
  const key = query.trim().toLowerCase();
  const hit = recentSearches.get(key);
  if (hit) return hit;
  const venues = await fetchVenues({ q: query }, signal);
  recentSearches.set(key, venues);
  if (recentSearches.size > RECENT_SEARCHES_MAX) recentSearches.delete(recentSearches.keys().next().value as string);
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
