import { LatLng } from "./latlng";

export interface Venue {
  id: string;
  name: string;
  address: string;
  coords: LatLng;
  city: string;
  capacity?: number;
}
