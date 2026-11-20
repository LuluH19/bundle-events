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
  firstdate_begin?: string | null;
  lastdate_end?: string | null;
}

const DAY_MS = 86400000;

export function isShortEvent(first?: string | null, last?: string | null, maxDays = eventsConfig.maxEventSpanDays): boolean {
  if (!first || !last) return true;
  const span = (Date.parse(last) - Date.parse(first)) / DAY_MS;
  return !Number.isFinite(span) || span <= maxDays;
}

interface OpenDataSource {
  baseUrl: string;
  extraFilter: string;
}

export class OpenDataEventAdapter implements EventProvider {
  constructor(
    private readonly source: OpenDataSource = eventsConfig.openDataIdf,
    private readonly idPrefix = ""
  ) {}

  async searchEvents({ query, city, limit = eventsConfig.defaultLimit }: EventSearchCriteria): Promise<Venue[]> {
    const q = query.trim().replace(/["\\]/g, "");
    if (!q) return [];
    const c = city?.trim().replace(/["\\]/g, "");

    const recent = `firstdate_begin >= now(days=-${eventsConfig.maxEventSpanDays})`;
    const ideas = eventsConfig.ideaKeywords.map((k) => `search(keywords_fr, "${k}") OR search(title_fr, "${k}")`).join(" OR ");
    const filters = c
      ? [`search(location_city, "${c}")`, `(${ideas})`, "location_coordinates IS NOT NULL", "firstdate_begin >= now()", this.source.extraFilter]
      : [
          `(search(title_fr, "${q}") OR search(location_name, "${q}") OR search(location_city, "${q}"))`,
          "location_coordinates IS NOT NULL",
          "lastdate_end >= now()",
          recent,
          this.source.extraFilter,
        ];

    const params = new URLSearchParams({
      where: filters.filter(Boolean).join(" AND "),
      order_by: "firstdate_begin",
      limit: String(limit * 2),
      select:
        "uid,title_fr,daterange_fr,location_name,location_address,location_city,location_coordinates,firstdate_begin,lastdate_end",
    });

    const res = await fetch(`${this.source.baseUrl}?${params}`, {
      signal: AbortSignal.timeout(eventsConfig.timeoutMs),
    });
    if (!res.ok) throw new Error(`Events API error: ${res.status}`);

    const data: { results?: OpenDataEventRecord[] } = await res.json();
    const records = (data.results ?? []).filter((r) => isShortEvent(r.firstdate_begin, r.lastdate_end)).slice(0, limit);
    return records.flatMap((r) => {
      const c = r.location_coordinates;
      if (!c || !r.title_fr) return [];
      return [
        {
          id: `${this.idPrefix}${r.uid}`,
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

export class OpenAgendaEventAdapter extends OpenDataEventAdapter {
  constructor() {
    super(eventsConfig.openAgenda, "oa-");
  }
}
