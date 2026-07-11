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
}

export interface RouteResult {
  segments: RouteSegment[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isMultimodal: boolean;
}

export interface RouteOption {
  id: string;
  mode: TransportMode;
  accessMode?: TransportMode;
  route: RouteResult;
  durationMin: number;
  distanceKm: number;
  price: number;
}

export interface TrainJourney {
  departureAt: string;
  arrivalAt: string;
  transfers: number;
  trains: {
    name: string;
    number: string;
    departureStation: string;
    arrivalStation: string;
    departureTime: string;
    arrivalTime: string;
  }[];
}
