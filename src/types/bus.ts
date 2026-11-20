import { LatLng } from "./latlng";

export interface BusNetwork {
  generatedAt: string;
  validFrom: string;
  validTo: string;
  operators: string[];
  stops: [name: string, lat: number, lng: number, operator: number][];
  links: Record<string, [departureMin: number, durationMin: number, weekdayMask: number][]>;
}

export interface BusDeparture {
  departure: string;
  arrival: string;
  durationMinutes: number;
}

export interface BusConnection {
  operator: string;
  from: { name: string; coords: LatLng };
  to: { name: string; coords: LatLng };
  durationMinutes: number;
  departures: BusDeparture[];
}
