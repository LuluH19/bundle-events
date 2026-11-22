import { EventProvider, EventSearchCriteria, Venue } from "@/src/types";
import { nominatimConfig, eventsConfig } from "@/src/config";

interface NominatimResult {
  osm_type: string;
  osm_id: number;
  category: string;
  type: string;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

/** Finds venues/parks/stadiums in France via OpenStreetMap (Nominatim). */
export class OsmVenueAdapter implements EventProvider {
  async searchEvents({ query, limit = eventsConfig.defaultLimit }: EventSearchCriteria): Promise<Venue[]> {
    const q = query.trim();
    if (!q) return [];

    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      countrycodes: nominatimConfig.countryCodes,
      addressdetails: "1",
      "accept-language": "fr",
      limit: String(limit * 2),
    });

    const res = await fetch(`${nominatimConfig.baseUrl}/search?${params}`, {
      headers: { "User-Agent": nominatimConfig.userAgent },
      signal: AbortSignal.timeout(eventsConfig.venueTimeoutMs),
    });
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

    const data: NominatimResult[] = await res.json();
    return data
      .filter((r) => r.name && (nominatimConfig.venueTypes as readonly string[]).includes(r.type))
      .map((r) => {
        const a = r.address ?? {};
        return {
          id: `osm-${r.osm_type}${r.osm_id}`,
          name: r.name!,
          address: r.display_name,
          coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
          city: a.city ?? a.town ?? a.village ?? a.municipality ?? "",
        };
      });
  }
}
