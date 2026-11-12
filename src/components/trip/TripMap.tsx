"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Location, TransportMode, TripSummary } from "@/src/types";
import { MODE_COLOR, MODE_SHORT } from "@/src/utils/constants/transport";
import { IconClose, IconExpand } from "@/src/components/ui";

const TravelMap = dynamic(() => import("@/src/components/TravelMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-mist" />,
});

export function TripMap({ trip, onExpand, full = false }: { trip: TripSummary; onExpand?: () => void; full?: boolean }) {
  const [direction, setDirection] = useState<"outbound" | "return">("outbound");
  const option = direction === "return" && trip.ret ? trip.ret : trip.outbound;
  const hotelLocation: Location | null = trip.hotel
    ? { id: trip.hotel.id, name: trip.hotel.name, coords: trip.hotel.coords, type: "hotel", address: trip.hotel.locationName }
    : null;
  const modes = useMemo(() => {
    const set = new Set<TransportMode>();
    option?.route.segments.forEach((s) => set.add(s.mode));
    return Array.from(set);
  }, [option]);

  return (
    <div className={full ? "flex h-full flex-col bg-white" : "overflow-hidden rounded-2xl bg-white ring-1 ring-line"}>
      {trip.roundTrip && trip.ret && (
        <div className="flex gap-1.5 p-2.5">
          {(["outbound", "return"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              aria-pressed={direction === d}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-semibold ${
                direction === d ? "bg-nuit text-white" : "bg-page text-ink hover:bg-mist"
              }`}
            >
              {d === "outbound" ? "Aller" : "Retour"}
            </button>
          ))}
        </div>
      )}
      <div className={full ? "relative min-h-0 flex-1" : "relative h-64 lg:h-72"}>
        <TravelMap
          departure={trip.departure}
          venue={trip.venue}
          hotel={hotelLocation}
          route={option?.route ?? null}
          hotelResults={[]}
          selectedHotelId={null}
          onHotelSelect={() => {}}
          hotelRadius={0}
          showHotels={false}
          fitPadding={full ? 80 : 50}
        />
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            aria-label="Agrandir la carte"
            className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-ink shadow-md ring-1 ring-line hover:bg-page"
          >
            <IconExpand size={15} /> Agrandir
          </button>
        )}
      </div>
      {modes.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-[12px] text-slate-500">
          {modes.map((m) => (
            <span key={m} className="flex items-center gap-1.5">
              <span className="h-1 w-3.5 rounded" style={{ backgroundColor: MODE_COLOR[m] }} /> {MODE_SHORT[m]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TripMapDialog({ trip, onClose }: { trip: TripSummary; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Carte de ton voyage" className="fixed inset-0 z-[60] flex animate-fade-in flex-col bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="font-display text-[18px] font-bold text-ink">Carte de ton voyage</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full bg-page px-3 py-1.5 text-[14px] font-semibold text-ink hover:bg-mist"
        >
          <IconClose size={15} /> Fermer
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <TripMap trip={trip} full />
      </div>
    </div>
  );
}
