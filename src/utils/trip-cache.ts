import type { BundleSnapshot, FlightInfo, HotelMapItem, RouteOption, TrainJourney } from "@/src/types";

export type TripCache = {
  uuid: string;
  snapshot: BundleSnapshot;
  outboundOptions: RouteOption[];
  returnOptions: RouteOption[];
  optionsKey: string;
  hotelResults: HotelMapItem[];
  hotelsKey: string;
  outboundTrains: TrainJourney[];
  returnTrains: TrainJourney[];
  outboundFlights: FlightInfo[];
  returnFlights: FlightInfo[];
  outTimesKey: string;
  retTimesKey: string;
};

let cache: TripCache | null = null;

export function writeTripCache(value: TripCache) {
  cache = value;
}

export function readTripCache(uuid: string | undefined): TripCache | null {
  return uuid && cache?.uuid === uuid ? cache : null;
}
