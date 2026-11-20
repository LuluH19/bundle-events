import type { Venue } from "@/src/types";

export async function searchEvents(query: string): Promise<Venue[]> {
  return fetchVenues({ q: query });
}

export async function searchEventIdeas(cities: string[]): Promise<Venue[]> {
  return fetchVenues({ cities: cities.join(",") });
}

async function fetchVenues(params: Record<string, string>): Promise<Venue[]> {
  const res = await fetch(`/api/events/search?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`Event search failed: ${res.status}`);
  const data: { venues?: Venue[] } = await res.json();
  return data.venues ?? [];
}
