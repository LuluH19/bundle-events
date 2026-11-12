import type { HotelMapItem, RouteOption, RouteSegment, TransportMode, TripTotal } from "@/src/types";
import { MODE_SHORT } from "@/src/utils/constants/transport";

const VEHICLES: TransportMode[] = ["plane", "train", "bus"];
const SUMMARY_ORDER: TransportMode[] = ["plane", "train", "bus", "car"];
const PLURAL: Partial<Record<TransportMode, string>> = { plane: "Avions", train: "Trains", bus: "Bus", car: "Voitures" };

export function vehicleSegments(option: RouteOption): RouteSegment[] {
  return option.route.segments.filter((s) => VEHICLES.includes(s.mode));
}

export function transferCount(option: RouteOption): number {
  return Math.max(0, vehicleSegments(option).length - 1);
}

export function transferLabel(option: RouteOption): string {
  const n = transferCount(option);
  if (n === 0) return vehicleSegments(option).length ? "Direct" : "Sans changement";
  return `${n} changement${n > 1 ? "s" : ""}`;
}

export function modeSummary(option: RouteOption): string {
  const counts = new Map<TransportMode, number>();
  option.route.segments.forEach((s) => counts.set(s.mode, (counts.get(s.mode) ?? 0) + 1));
  const parts = SUMMARY_ORDER.filter((m) => counts.get(m)).map((m) => {
    const c = counts.get(m) ?? 0;
    return c > 1 ? `${c} ${PLURAL[m]}` : MODE_SHORT[m];
  });
  return parts.length ? parts.join(" + ") : MODE_SHORT[option.mode];
}

export function changePoints(option: RouteOption): string[] {
  const vehicles = vehicleSegments(option);
  return vehicles.slice(0, -1).map((s) => s.to.name);
}

export function stayNights(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 1;
  const a = Date.parse(`${checkin.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${checkout.slice(0, 10)}T00:00:00Z`);
  const diff = Math.round((b - a) / 86400000);
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

export function tripTotal(params: {
  outbound: RouteOption | null;
  ret: RouteOption | null;
  hotel: HotelMapItem | null;
  nights: number;
  roundTrip: boolean;
  withHotel: boolean;
}): TripTotal {
  const outbound = params.outbound?.price ?? 0;
  const ret = params.roundTrip ? params.ret?.price ?? 0 : 0;
  const hotel = params.withHotel && params.hotel?.pricePerNight ? params.hotel.pricePerNight * params.nights : 0;
  return { outbound, hotel, ret, total: outbound + hotel + ret };
}
