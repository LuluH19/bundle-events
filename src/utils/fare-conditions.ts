import type { HotelMapItem, RouteOption, TransportMode } from "@/src/types";
import { fareConditionsConfig } from "@/src/config/fare-conditions";

export interface HotelConditions {
  cancellation?: { label: string; free: boolean };
  board?: string;
}

export interface TransportConditionsLink {
  mode: TransportMode;
  carrier: string;
  url: string;
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export function formatCancellationDeadline(iso: string): string {
  const d = new Date(iso);
  return `${dayFormat.format(d)} à ${timeFormat.format(d).replace(":", "h")}`;
}

export function hotelConditions(
  hotel: Pick<HotelMapItem, "refundable" | "freeCancellationUntil" | "board">,
  now: Date = new Date()
): HotelConditions {
  const board = hotel.board ? fareConditionsConfig.hotelBoardLabels[hotel.board] : undefined;
  let cancellation: HotelConditions["cancellation"];
  if (hotel.refundable === false) {
    cancellation = { label: "Non remboursable", free: false };
  } else if (hotel.refundable && hotel.freeCancellationUntil) {
    cancellation =
      new Date(hotel.freeCancellationUntil) > now
        ? { label: `Annulation gratuite jusqu'au ${formatCancellationDeadline(hotel.freeCancellationUntil)}`, free: true }
        : { label: "Annulation payante", free: false };
  } else if (hotel.refundable) {
    cancellation = { label: "Annulation gratuite", free: true };
  }
  return { ...(cancellation && { cancellation }), ...(board && { board }) };
}

export function transportConditions(option: RouteOption): TransportConditionsLink[] {
  const modes = new Set(option.route.segments.map((s) => s.mode));
  const links: TransportConditionsLink[] = [];
  for (const mode of ["train", "bus"] as const) {
    if (modes.has(mode)) links.push({ mode, ...fareConditionsConfig.transport[mode] });
  }
  return links;
}
