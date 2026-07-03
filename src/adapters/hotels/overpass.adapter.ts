import { HotelMapItem, HotelProvider, HotelSearchCriteria } from "@/src/types";
import { overpassConfig } from "@/src/config";

const overpassCache = new Map<string, { data: HotelMapItem[]; ts: number }>();

export class OverpassHotelAdapter implements HotelProvider {
  private async fetchOverpass(query: string): Promise<unknown | null> {
    const body = `data=${encodeURIComponent(query)}`;
    for (const url of overpassConfig.mirrors) {
      try {
        const res = await fetch(url, {
          method: "POST",
          body,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: AbortSignal.timeout(overpassConfig.timeoutMs),
        });
        if (!res.ok) continue;
        return await res.json();
      } catch {
        // try the next mirror
      }
    }
    return null;
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<HotelMapItem[]> {
    const { lat, lng, radiusKm } = criteria;
    const cacheKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)},${radiusKm}`;
    const cached = overpassCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < overpassConfig.cacheTtl) return cached.data;

    const radiusMeters = Number(radiusKm) * 1000;
    const query = `[out:json][timeout:15];(nwr["tourism"="hotel"](around:${radiusMeters},${lat},${lng});nwr["tourism"="hostel"](around:${radiusMeters},${lat},${lng});nwr["tourism"="guest_house"](around:${radiusMeters},${lat},${lng}););out center 40;`;

    type OverpassEl = {
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags: Record<string, string>;
    };
    
    const data = (await this.fetchOverpass(query)) as { elements?: OverpassEl[] } | null;
    
    // On a total failure keep whatever we had cached, but never cache an empty
    // result — a transient outage must not hide hotels for the next 5 minutes.
    if (!data) return cached?.data ?? [];

    const hotels: HotelMapItem[] = (data.elements || [])
      .filter((el) => el.tags?.name)
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        const tags = el.tags;
        const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
        const cityLine = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
        const addr = [street, cityLine].filter(Boolean).join(", ");
        return {
          id: `osm-${el.id}`,
          name: tags.name,
          locationName: addr,
          coords: { lat: elLat!, lng: elLng! },
          stars: tags.stars ? Number(tags.stars) : undefined,
          website: tags.website || tags["contact:website"] || undefined,
          phone: tags.phone || tags["contact:phone"] || undefined,
          type: tags.tourism,
          source: "overpass" as const,
        };
      })
      .filter((h: HotelMapItem) => h.coords.lat && h.coords.lng);

    if (hotels.length > 0) {
      overpassCache.set(cacheKey, { data: hotels, ts: Date.now() });
    }
    return hotels;
  }
}
