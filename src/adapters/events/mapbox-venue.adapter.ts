import { EventProvider, EventSearchCriteria, Venue } from "@/src/types";
import { mapboxConfig, eventsConfig } from "@/src/config";

interface SearchBoxFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    mapbox_id: string;
    name: string;
    full_address?: string;
    place_formatted?: string;
    context?: { place?: { name: string } };
  };
}

/** Finds venues (stadiums, parks, arenas...) anywhere in France via the Mapbox Search Box API (POIs). */
export class MapboxVenueAdapter implements EventProvider {
  async searchEvents({ query, limit = eventsConfig.defaultLimit }: EventSearchCriteria): Promise<Venue[]> {
    const q = query.trim();
    if (!q || !mapboxConfig.token) return [];

    const params = new URLSearchParams({
      q,
      access_token: mapboxConfig.token,
      country: "fr",
      bbox: mapboxConfig.franceBbox,
      types: "poi",
      language: mapboxConfig.defaultLanguage,
      limit: String(limit),
    });

    const res = await fetch(`${mapboxConfig.searchBoxBaseUrl}/forward?${params}`);
    if (!res.ok) throw new Error(`Mapbox Search Box error: ${res.status}`);

    const data: { features?: SearchBoxFeature[] } = await res.json();
    return (data.features ?? []).map((f) => ({
      id: `poi-${f.properties.mapbox_id}`,
      name: f.properties.name,
      address: f.properties.full_address ?? f.properties.place_formatted ?? "",
      coords: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
      city: f.properties.context?.place?.name ?? f.properties.place_formatted ?? "",
    }));
  }
}
