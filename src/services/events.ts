import { EventProvider, Venue } from "@/src/types";
import { LocalEventAdapter } from "@/src/adapters/events";

const provider: EventProvider = new LocalEventAdapter();

export function searchEvents(query: string): Promise<Venue[]> {
  return provider.searchEvents({ query });
}
