export type LatLng = { lat: number; lng: number };

export type TransportMode = "car" | "train" | "plane" | "bus" | "walking";

export type LocationType = "departure" | "hotel" | "venue";

export interface Location {
  id: string;
  name: string;
  coords: LatLng;
  type: LocationType;
  address?: string;
  iataCode?: string;
  sncfId?: string;
}

export interface RouteSegment {
  from: { name: string; coords: LatLng };
  to: { name: string; coords: LatLng };
  mode: TransportMode;
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
}

export interface FlightInfo {
  airline: string;
  flightNumber: string;
  price: number;
  departureAt: string;
  transfers: number;
  durationMinutes: number;
}

export interface HotelMapItem {
  id: string;
  name: string;
  locationName: string;
  coords: LatLng;
  stars?: number;
  website?: string;
  phone?: string;
  type?: string;
  photo?: string;
  pricePerNight?: number;
  currency?: string;
  rating?: number;
  source?: "liteapi" | "overpass";
}

export interface RouteResult {
  segments: RouteSegment[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isMultimodal: boolean;
}

export interface Station {
  id: string;
  name: string;
  coords: LatLng;
  sncfId: string;
}

export interface Airport {
  id: string;
  name: string;
  coords: LatLng;
  iataCode: string;
  city: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  coords: LatLng;
  city: string;
  capacity?: number;
}
