import type { ReactNode } from "react";
import type { Location, LatLng, RouteOption, TrainJourney, FlightInfo, RouteResult, Step, HotelMapItem } from "./index";

export type IconProps = { size?: number; className?: string };

export interface RoutesViewProps {
  departure: Location | null;
  venue: Location | null;
  dateLabel: string;
  options: RouteOption[];
  loading: boolean;
  selectedModeId: string | null;
  onSelectMode: (id: string) => void;
  direction: "outbound" | "return";
  setDirection: (d: "outbound" | "return") => void;
  roundTrip: boolean;
  trainJourneys: TrainJourney[];
  flights: FlightInfo[];
  journeyRoute: RouteResult | null;
  onContinue: () => void;
}

export interface HotelsViewProps {
  venue: Location | null;
  hotelRadius: number;
  setHotelRadius: (n: number) => void;
  hotelResults: HotelMapItem[];
  hotelLoading: boolean;
  hotelError: string;
  selectedHotel: HotelMapItem | null;
  onSelectHotel: (h: HotelMapItem | null) => void;
  departure: Location | null;
  hotelLocation: Location | null;
  mobileMapOpen: boolean;
  setMobileMapOpen: (v: boolean) => void;
  onContinue: () => void;
}

export interface HomeViewProps {
  departure: Location | null;
  venue: Location | null;
  depSearch: string;
  setDepSearch: (v: string) => void;
  depResults: { displayName: string; address: string; coords: LatLng }[];
  depFocus: boolean;
  setDepFocus: (v: boolean) => void;
  onPickDeparture: (r: { displayName: string; address: string; coords: LatLng }) => void;
  onClearDeparture: () => void;
  onPickVenue: (id: string) => void;
  onClearVenue: () => void;
  venueSearch: string;
  setVenueSearch: (v: string) => void;
  venueResults: { id: string; name: string; city: string }[];
  venueFocus: boolean;
  setVenueFocus: (v: boolean) => void;
  roundTrip: boolean;
  setRoundTrip: (v: boolean) => void;
  dateLabel: string;
  checkin: string;
  checkout: string;
  setCheckin: (v: string) => void;
  setCheckout: (v: string) => void;
  onCompose: () => void;
  pickEvent: (id: string) => void;
}

export interface BundleViewProps {
  departure: Location | null;
  venue: Location | null;
  dateLabel: string;
  outboundOption: RouteOption | null;
  returnOption: RouteOption | null;
  roundTrip: boolean;
  selectedHotel: HotelMapItem | null;
  checkin: string;
  checkout: string;
  onEdit: (s: Step) => void;
}

export interface TravelMapProps {
  departure: Location | null;
  venue: Location | null;
  hotel: Location | null;
  route: RouteResult | null;
  hotelResults: HotelMapItem[];
  selectedHotelId: string | null;
  onHotelSelect: (hotel: HotelMapItem) => void;
  hotelRadius: number;
  showHotels: boolean;
}

export interface SideNavProps {
  step: Step;
  go: (s: Step) => void;
  canReach: (s: Step) => boolean;
  venue: Location | null;
  roundTrip: boolean;
}

export interface MobileTabBarProps {
  step: Step;
  go: (s: Step) => void;
  canReach: (s: Step) => boolean;
  roundTrip: boolean;
}

export interface HeaderProps {
  step: Step;
  go: (s: Step) => void;
  canReach: (s: Step) => boolean;
}

export interface EyebrowProps {
  children: ReactNode;
  className?: string;
  tone?: "ember" | "navy" | "muted";
}

export interface ChipProps {
  children: ReactNode;
  className?: string;
}

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "dark" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}
