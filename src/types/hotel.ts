import { LatLng } from "./latlng";

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
  source?: "liteapi";
}

export interface HotelSearchCriteria {
  lat: string;
  lng: string;
  radiusKm: string;
  checkin?: string;
  checkout?: string;
}

export interface HotelProvider {
  searchHotels(criteria: HotelSearchCriteria): Promise<HotelMapItem[]>;
}
