export type TripPreference = "fast" | "cheap" | "green";

export type BookingKey = "outbound" | "hotel" | "return";

export type BookedState = Partial<Record<BookingKey, boolean>>;

export interface TripTotal {
  outbound: number;
  hotel: number;
  ret: number;
  total: number;
}
