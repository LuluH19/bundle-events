import { EventProvider, EventSearchCriteria, Venue } from "@/src/types";
import { venues } from "@/src/utils/constants/venues";

export class LocalEventAdapter implements EventProvider {
  async searchEvents({ query, limit = 6 }: EventSearchCriteria): Promise<Venue[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return venues
      .filter((v) => `${v.name} ${v.city}`.toLowerCase().includes(q))
      .slice(0, limit);
  }
}
