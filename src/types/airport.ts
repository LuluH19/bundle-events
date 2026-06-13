import { LatLng } from "./latlng";

export interface Airport {
  id: string;
  name: string;
  coords: LatLng;
  iataCode: string;
  city: string;
}
