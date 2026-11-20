import { haversineDistance } from "@/src/utils/algorithms/geodesic";

export const FLIXBUS_HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };

/** FlixBus wants ride dates as DD.MM.YYYY. */
export function toFlixDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Resolve a city name to a FlixBus city UUID, closest to the leg coordinates.
 * FlixBus' shop deep-link and search API need these internal UUIDs (a plain city
 * name won't do), so we resolve them via their public autocomplete server-side.
 */
export async function resolveFlixbusCityId(name: string, lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://global.api.flixbus.com/search/autocomplete/cities?q=${encodeURIComponent(
      name
    )}&lang=fr&country=FR`;
    const res = await fetch(url, { headers: FLIXBUS_HEADERS });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      id: string;
      location?: { lat: number; lon: number };
    }[];
    if (!Array.isArray(data) || !data.length) return null;

    const best = data
      .filter(c => c.id && c.location)
      .map(c => ({ id: c.id, d: haversineDistance({ lat, lng }, { lat: c.location!.lat, lng: c.location!.lon }) }))
      .sort((a, b) => a.d - b.d)[0];

    return best?.id ?? null;
  } catch {
    return null;
  }
}
