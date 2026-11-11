import type { FlightInfo, HotelMapItem, LatLng, Location, RouteOption, TrainJourney, Venue } from "./index";
import type { BookedState, BookingKey, TripPreference, TripTotal } from "./trip";
import type { Step } from "./step";

export type PanelKind = "outbound" | "return" | "hotel" | "dates";

export interface DepartureSuggestion {
  displayName: string;
  address: string;
  coords: LatLng;
}

export interface TripSummary {
  departure: Location | null;
  venue: Location | null;
  dateLabel: string;
  checkin: string;
  stayCheckout: string;
  returnDate: string;
  roundTrip: boolean;
  withHotel: boolean;
  nights: number;
  outbound: RouteOption | null;
  ret: RouteOption | null;
  hotel: HotelMapItem | null;
  preference: TripPreference | null;
  total: TripTotal;
  outboundTrains: TrainJourney[];
  returnTrains: TrainJourney[];
  outboundFlights: FlightInfo[];
  returnFlights: FlightInfo[];
  optionsLoading: boolean;
  hotelLoading: boolean;
  hotelError: string;
}

export interface TripViewProps {
  trip: TripSummary;
  onGo: (s: Step) => void;
  onOpenPanel: (p: PanelKind) => void;
  onPreference: (p: TripPreference) => void;
}

export interface BookViewProps {
  trip: TripSummary;
  booked: BookedState;
  onToggleBooked: (key: BookingKey) => void;
  onGo: (s: Step) => void;
  onOpenPanel: (p: PanelKind) => void;
  onShare: () => void;
}

export interface HomeViewProps {
  departure: Location | null;
  venue: Location | null;
  depSearch: string;
  setDepSearch: (v: string) => void;
  depResults: DepartureSuggestion[];
  onPickDeparture: (r: DepartureSuggestion) => void;
  onClearDeparture: () => void;
  venueSearch: string;
  setVenueSearch: (v: string) => void;
  venueResults: Venue[];
  onPickVenue: (v: Venue) => void;
  onClearVenue: () => void;
  roundTrip: boolean;
  setRoundTrip: (v: boolean) => void;
  dateLabel: string;
  onOpenDates: () => void;
  canCompose: boolean;
  composing: boolean;
  onCompose: () => void;
}
