import type { Location } from "./location";
import type { RouteOption } from "./route";
import type { HotelMapItem } from "./hotel";
import type { BookedState, TripPreference } from "./trip";

/**
 * Snapshot of everything the user has composed. Stored as JSONB in Supabase and
 * enough to re-render the whole bundle from a shared link.
 */
export interface BundleSnapshot {
  departure: Location | null;
  venue: Location | null;
  checkin: string;
  checkout: string;
  roundTrip: boolean;
  outboundOption: RouteOption | null;
  returnOption: RouteOption | null;
  selectedHotel: HotelMapItem | null;
  /** Aller-retour le même jour : l'utilisateur a choisi d'ajouter un hôtel. */
  hotelOptIn?: boolean;
  preference?: TripPreference | null;
  arriveBy?: string;
  leaveAfter?: string;
  booked?: BookedState;
}

/** A persisted bundle row (public shape: neither the internal bigint id nor the owner's email is exposed). */
export interface BundleRecord {
  uuid: string;
  data: BundleSnapshot;
  created_at: string;
  updated_at: string;
}

export function emptySnapshot(): BundleSnapshot {
  return {
    departure: null,
    venue: null,
    checkin: "",
    checkout: "",
    roundTrip: true,
    outboundOption: null,
    returnOption: null,
    selectedHotel: null,
  };
}
