import { Venue } from "./venue";

export interface EventSearchCriteria {
  query: string;
  limit?: number;
}

export interface EventProvider {
  searchEvents(criteria: EventSearchCriteria): Promise<Venue[]>;
}
