"use client";

import type { HotelMapItem, Location, RouteOption, TripPreference } from "@/src/types";
import { Sheet } from "@/src/components/Sheet";
import { DateRangePicker, type DateSelection } from "@/src/components/DateRangePicker";
import { OptionList } from "@/src/components/trip/OptionList";
import { HotelPicker } from "@/src/components/trip/HotelPicker";

export type Panel = "outbound" | "return" | "hotel" | "dates" | null;

interface TripPanelsProps {
  panel: Panel;
  onClose: () => void;
  roundTrip: boolean;
  dates: DateSelection;
  onDates: (d: DateSelection) => void;
  outboundOptions: RouteOption[];
  returnOptions: RouteOption[];
  selectedOutboundId: string | null;
  selectedReturnId: string | null;
  optionsLoading: boolean;
  onSelectOutbound: (id: string) => void;
  onSelectReturn: (id: string) => void;
  hotels: HotelMapItem[];
  venue: Location | null;
  selectedHotel: HotelMapItem | null;
  preference: TripPreference;
  hotelRadius: number;
  onHotelRadius: (r: number) => void;
  hotelLoading: boolean;
  hotelError: string;
  onChooseHotel: (h: HotelMapItem) => void;
}

export function TripPanels(p: TripPanelsProps) {
  return (
    <>
      <DateRangePicker open={p.panel === "dates"} onClose={p.onClose} roundTrip={p.roundTrip} value={p.dates} onApply={p.onDates} />
      <Sheet open={p.panel === "outbound"} title="Changer l'aller" onClose={p.onClose}>
        <OptionList
          options={p.outboundOptions}
          selectedId={p.selectedOutboundId}
          loading={p.optionsLoading}
          onSelect={(id) => {
            p.onSelectOutbound(id);
            p.onClose();
          }}
        />
      </Sheet>
      <Sheet open={p.panel === "return"} title="Changer le retour" onClose={p.onClose}>
        <OptionList
          options={p.returnOptions}
          selectedId={p.selectedReturnId}
          loading={p.optionsLoading}
          onSelect={(id) => {
            p.onSelectReturn(id);
            p.onClose();
          }}
        />
      </Sheet>
      <Sheet open={p.panel === "hotel"} title="Changer d'hôtel" onClose={p.onClose}>
        <HotelPicker
          hotels={p.hotels}
          venue={p.venue}
          selected={p.selectedHotel}
          preference={p.preference}
          radius={p.hotelRadius}
          onRadius={p.onHotelRadius}
          loading={p.hotelLoading}
          error={p.hotelError}
          onChoose={(h) => {
            p.onChooseHotel(h);
            p.onClose();
          }}
        />
      </Sheet>
    </>
  );
}
