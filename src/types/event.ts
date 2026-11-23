import { Venue } from "./venue";

export interface EventSearchCriteria {
  query: string;
  city?: string;
  limit?: number;
  keywords?: readonly string[];
  ticketmasterClassification?: string;
}

export interface EventProvider {
  searchEvents(criteria: EventSearchCriteria): Promise<Venue[]>;
}
