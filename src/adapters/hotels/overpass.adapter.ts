import { HotelMapItem, HotelProvider, HotelSearchCriteria } from "@/src/types";
import { overpassConfig } from "@/src/config";

export class OverpassHotelAdapter implements HotelProvider {
  /** Queries every mirror at once; the first valid answer wins and the others are aborted. */
  private async fetchOverpass(query: string): Promise<unknown | null> {
    const body = `data=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(overpassConfig.timeoutMs)]);
    try {
      return await Promise.any(
        overpassConfig.mirrors.map(async (url) => {
          const res = await fetch(url, {
            method: "POST",
            body,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": overpassConfig.userAgent,
            },
            signal,
          });
          if (!res.ok) throw new Error(`Overpass ${url}: ${res.status}`);
          return await res.json();
        })
      );
    } catch {
      return null;
    } finally {
      controller.abort();
    }
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<HotelMapItem[]> {
    const { lat, lng, radiusKm } = criteria;
    const radiusMeters = Number(radiusKm) * 1000;
    const query = `[out:json][timeout:25];(nwr["tourism"="hotel"](around:${radiusMeters},${lat},${lng});nwr["tourism"="hostel"](around:${radiusMeters},${lat},${lng});nwr["tourism"="guest_house"](around:${radiusMeters},${lat},${lng}););out center 40;`;

    type OverpassEl = {
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags: Record<string, string>;
    };
    
    const data = (await this.fetchOverpass(query)) as { elements?: OverpassEl[] } | null;
    
    // Every mirror failed: throw so the shared cache can serve its last copy.
    if (!data) throw new Error("Overpass: all mirrors failed");

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

    return hotels;
  }
}
