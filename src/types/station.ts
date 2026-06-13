import { LatLng } from "./latlng";

export interface Station {
  id: string;
  name: string;
  coords: LatLng;
  sncfId: string;
}

export interface BusStation {
  id: string;
  name: string;
  coords: LatLng;
  city: string;
}

export interface DynamicStation {
  id: string;
  name: string;
  sncfId: string;
  coords: LatLng;
}

export interface StationData {
  id: string;
  name: string;
  sncfId: string;
  coords: LatLng;
}
