export interface SNCFSection {
  type: string;
  departure_date_time?: string;
  arrival_date_time?: string;
  from?: { name: string; stop_area?: { name: string } };
  to?: { name: string; stop_area?: { name: string } };
  geojson?: { coordinates: [number, number][] };
  display_informations?: {
    commercial_mode?: string;
    physical_mode?: string;
    label?: string;
    headsign?: string;
    direction?: string;
    name?: string;
    network?: string;
    trip_short_name?: string;
    code?: string;
    description?: string;
  };
}

export interface TrainDetail {
  type: string;
  name: string;
  number: string;
  network: string;
  direction: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
}

export interface StopCoord {
  name: string;
  lat: number;
  lng: number;
}

export interface RouteSection {
  mode: string;
  color?: string;
  label?: string;
  fromName: string;
  toName: string;
  coordinates: [number, number][];
}
