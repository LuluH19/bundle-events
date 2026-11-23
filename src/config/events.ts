import { EVENT_CATEGORIES } from "@/src/utils/constants/event-categories";

export const eventsConfig = {
  ticketmaster: {
    apiKey: process.env.TICKETMASTER_API_KEY || "",
    baseUrl: "https://app.ticketmaster.com/discovery/v2/events.json",
    countryCode: "FR",
    locale: "fr-fr",
  },
  openAgenda: {
    baseUrl: "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/records",
    extraFilter: 'location_countrycode = "FR"',
  },
  openDataIdf: {
    baseUrl: "https://opendata.iledefrance.fr/api/explore/v2.1/catalog/datasets/evenements-publics-cibul/records",
    extraFilter: "",
  },
  timeoutMs: 6000,
  defaultLimit: 6,
  ideaKeywords: ["concert", "festival", "spectacle", "match"],
  ideaCategories: EVENT_CATEGORIES,
  ideasLimit: 8,
  maxEventSpanDays: 31,
} as const;
