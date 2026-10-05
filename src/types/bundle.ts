import type { Location } from "./location";
import type { RouteOption } from "./route";
import type { HotelMapItem } from "./hotel";

export type PaymentStatus = "paid" | "unpaid";

export interface GroupMemberPayment {
  id: string;
  name: string;
  email: string;
  amount: number;
  status: PaymentStatus;
  paidAt: string | null;
}

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
  /** Payment tracking for people who received the private bundle link. */
  payments: GroupMemberPayment[];
}

/** A persisted bundle row (public shape — the internal bigint id is never exposed). */
export interface BundleRecord {
  uuid: string;
  email: string | null;
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
    payments: [],
  };
}
