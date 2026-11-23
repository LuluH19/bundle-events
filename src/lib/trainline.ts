import { haversineDistance } from "@/src/utils/algorithms/geodesic";

export const TRAINLINE_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

/**
 * Resolve a station/city name to a Trainline location URN, picking the candidate
 * closest to the coordinates we already have for the leg. Trainline's booking
 * deep-link (/book/results) and journey search need these proprietary URNs — they
 * aren't derivable from a plain station name, so we look them up server-side.
 */
export async function resolveTrainlineUrn(name: string, lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://www.thetrainline.com/api/locations-search/v2/search?searchTerm=${encodeURIComponent(
      name
    )}&locale=fr-FR`;
    const res = await fetch(url, { headers: TRAINLINE_HEADERS });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      searchLocations?: { code: string; latitude: number; longitude: number; locationType?: string }[];
    };
    const locs = (data.searchLocations || []).filter(l => l.code?.startsWith("urn:trainline:generic:loc:"));
    if (!locs.length) return null;

    const best = locs
      .map(l => ({ code: l.code, d: haversineDistance({ lat, lng }, { lat: l.latitude, lng: l.longitude }) }))
      .sort((a, b) => a.d - b.d)[0];

    return best?.code ?? null;
  } catch {
    return null;
  }
}
