import { LatLng } from "./latlng";

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
