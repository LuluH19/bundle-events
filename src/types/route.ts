import { LatLng } from "./latlng";

export type TransportMode = "car" | "train" | "plane" | "bus" | "walking";

export interface RouteSegment {
  from: { name: string; coords: LatLng };
  to: { name: string; coords: LatLng };
  mode: TransportMode;
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  color?: string;
  label?: string;
  access?: boolean;
  departureTime?: string;
  arrivalTime?: string;
  waitTimeMinutes?: number;
}

export interface RouteResult {
  segments: RouteSegment[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isMultimodal: boolean;
  transports?: number;
  transportsByMode?: Partial<Record<TransportMode, number>>;
}

/** `live` = prix du jour chez le vendeur, `tariff` = grille officielle min/max, `estimate` = calcul local. */
export type PriceSource = "live" | "tariff" | "estimate";

export interface PriceQuote {
  amount: number;
  max?: number;
  /** Reliability of the main (ticketed) part of the price. */
  source: PriceSource;
  provider?: string;
  /** Estimated access cost (car fuel, local transport) already included in `amount`. */
  extras?: number;
}

/** One priced stretch of a trip (the main plane / train / bus span of an option). */
export interface PriceLeg {
  from: { name: string; coords: LatLng };
  to: { name: string; coords: LatLng };
  /** Local departure datetime, `YYYY-MM-DDTHH:mm`. */
  datetime: string;
}

export interface RouteOption {
  id: string;
  mode: TransportMode;
  accessMode?: TransportMode;
  route: RouteResult;
  durationMin: number;
  distanceKm: number;
  price: number;
  quote?: PriceQuote;
  /** Per bookable mode (plane / train / bus), aligned with each « Réserver sur … » button. */
  modeQuotes?: Partial<Record<"plane" | "train" | "bus", PriceQuote>>;
}

export interface TrainJourney {
  departureAt: string;
  arrivalAt: string;
  transfers: number;
  durationMinutes?: number;
  trains: {
    name: string;
    number: string;
    departureStation: string;
    arrivalStation: string;
    departureTime: string;
    arrivalTime: string;
    waitTimeAfterMinutes?: number;
  }[];
}
