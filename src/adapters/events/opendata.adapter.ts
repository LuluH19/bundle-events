import { EventProvider, EventSearchCriteria, Venue } from "@/src/types";
import { eventsConfig } from "@/src/config";

interface OpenDataEventRecord {
  uid: string;
  title_fr: string | null;
  daterange_fr?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  location_city?: string | null;
  location_coordinates?: { lat: number; lon: number } | null;
}

export class OpenDataEventAdapter implements EventProvider {
  async searchEvents({ query, limit = eventsConfig.defaultLimit }: EventSearchCriteria): Promise<Venue[]> {
    const q = query.trim().replace(/["\\]/g, "");
    if (!q) return [];

    const params = new URLSearchParams({
      where: `(search(title_fr, "${q}") OR search(location_name, "${q}") OR search(location_city, "${q}")) AND location_coordinates IS NOT NULL AND lastdate_end >= now()`,
      order_by: "firstdate_begin",
      limit: String(limit),
      select:
        "uid,title_fr,daterange_fr,location_name,location_address,location_city,location_coordinates",
    });

    const res = await fetch(`${eventsConfig.baseUrl}?${params}`);
    if (!res.ok) throw new Error(`Events API error: ${res.status}`);

    const data: { results?: OpenDataEventRecord[] } = await res.json();
    return (data.results ?? []).flatMap((r) => {
      const c = r.location_coordinates;
      if (!c || !r.title_fr) return [];
      return [
        {
          id: r.uid,
          name: r.title_fr,
          address: [r.location_name, r.location_address].filter(Boolean).join(", "),
          coords: { lat: c.lat, lng: c.lon },
          city: r.location_city ?? "",
          dateLabel: r.daterange_fr ?? undefined,
        },
      ];
    });
  }
}
