import { LatLng } from "./latlng";

export interface GeocodingResult {
  displayName: string;
  address: string;
  coords: LatLng;
  type: string;
}
