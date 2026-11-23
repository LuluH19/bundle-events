import { EventProvider, EventSearchCriteria, Venue } from "@/src/types";
import { eventsConfig } from "@/src/config";

interface TicketmasterVenue {
  name?: string;
  address?: { line1?: string };
  city?: { name?: string };
  postalCode?: string;
  location?: { latitude?: string; longitude?: string };
}

interface TicketmasterEvent {
  id: string;
  name: string;
  dates?: { start?: { localDate?: string; localTime?: string } };
  _embedded?: { venues?: TicketmasterVenue[] };
}

export function formatTicketmasterDate(localDate?: string, localTime?: string): string | undefined {
  if (!localDate) return undefined;
  const [y, m, d] = localDate.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
  const label = day.charAt(0).toUpperCase() + day.slice(1);
  return localTime ? `${label}, ${localTime.slice(0, 5).replace(":", "h")}` : label;
}

export function mapTicketmasterEvents(events: TicketmasterEvent[]): Venue[] {
  return events.flatMap((e) => {
    const v = e._embedded?.venues?.[0];
    const lat = Number(v?.location?.latitude);
    const lng = Number(v?.location?.longitude);
    if (!v || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return [];
    return [
      {
        id: `tm-${e.id}`,
        name: e.name,
        address: [v.name, v.address?.line1, [v.postalCode, v.city?.name].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        coords: { lat, lng },
        city: v.city?.name ?? "",
        dateLabel: formatTicketmasterDate(e.dates?.start?.localDate, e.dates?.start?.localTime),
      },
    ];
  });
}

export class TicketmasterEventAdapter implements EventProvider {
  private async fetchEvents(params: Record<string, string>): Promise<TicketmasterEvent[]> {
    const { apiKey, baseUrl, countryCode, locale } = eventsConfig.ticketmaster;
    const search = new URLSearchParams({ apikey: apiKey, countryCode, locale, sort: "date,asc", ...params });
    const res = await fetch(`${baseUrl}?${search}`, { signal: AbortSignal.timeout(eventsConfig.timeoutMs) });
    if (!res.ok) throw new Error(`Ticketmaster error: ${res.status}`);
    const data: { _embedded?: { events?: TicketmasterEvent[] } } = await res.json();
    return data._embedded?.events ?? [];
  }

  async searchEvents({ query, city, limit = eventsConfig.defaultLimit, ticketmasterClassification }: EventSearchCriteria): Promise<Venue[]> {
    const q = query.trim();
    if (!q || !eventsConfig.ticketmaster.apiKey) return [];
    const size = String(limit);
    if (city) {
      const params: Record<string, string> = { city, size };
      if (ticketmasterClassification) params.classificationName = ticketmasterClassification;
      return mapTicketmasterEvents(await this.fetchEvents(params));
    }
    const byKeyword = await this.fetchEvents({ keyword: q, size });
    const events = byKeyword.length > 0 ? byKeyword : await this.fetchEvents({ city: q, size });
    return mapTicketmasterEvents(events);
  }
}
