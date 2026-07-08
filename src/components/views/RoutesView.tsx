"use client";

import dynamic from "next/dynamic";
import { Location, TransportMode, RouteResult, RouteOption, TrainJourney, FlightInfo } from "@/src/types";
import { MODE_META } from "@/src/utils/constants/transport";
import { formatDuration, formatDistance, timeOf } from "@/src/utils/format";
import { Button, Chip, Eyebrow, MODE_ICON, IconArrow } from "@/src/components/ui";

const TravelMap = dynamic(() => import("@/src/components/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-mist">
      <p className="text-sm text-slate-400">Chargement de la carte…</p>
    </div>
  ),
});

interface RoutesViewProps {
  departure: Location | null;
  venue: Location | null;
  dateLabel: string;
  options: RouteOption[];
  loading: boolean;
  selectedMode: TransportMode | null;
  onSelectMode: (m: TransportMode) => void;
  trainJourneys: TrainJourney[];
  flights: FlightInfo[];
  journeyRoute: RouteResult | null;
  onContinue: () => void;
}

export function RoutesView(props: RoutesViewProps) {
  const {
    departure,
    venue,
    dateLabel,
    options,
    loading,
    selectedMode,
    onSelectMode,
    trainJourneys,
    flights,
    journeyRoute,
    onContinue,
  } = props;
  const fastest = options[0]?.mode;

  return (
    <div className="flex flex-col md:h-[calc(100dvh-65px)] md:flex-row-reverse">
      {/* Map */}
      <div className="h-[300px] shrink-0 md:h-full md:flex-1">
        <TravelMap
          departure={departure}
          venue={venue}
          hotel={null}
          route={journeyRoute}
          hotelResults={[]}
          selectedHotelId={null}
          onHotelSelect={() => {}}
          hotelRadius={0}
          showHotels={false}
        />
      </div>

      {/* List */}
      <aside className="scroll-slim w-full overflow-y-auto border-line bg-page p-5 md:w-[460px] md:border-r md:p-7">
        <Eyebrow className="mb-2">Étape 02 · Transport</Eyebrow>
        <h2 className="font-display text-[30px] font-extrabold leading-tight tracking-tight text-ink md:text-[40px]">
          {options.length || loading ? (
            <>
              Plusieurs façons d&apos;<span className="text-ember">y aller.</span>
            </>
          ) : (
            "Choisissez votre trajet."
          )}
        </h2>
        <p className="mt-2 text-[14px] text-slate-500">
          {departure?.name} <span className="text-slate-400">→</span> {venue?.name} · {dateLabel}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {loading &&
            [0, 1, 2].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-mist" />)}

          {!loading &&
            options.map((o) => {
              const Icon = MODE_ICON[o.mode];
              const meta = MODE_META[o.mode];
              const selected = o.mode === selectedMode;
              return (
                <button
                  key={o.mode}
                  onClick={() => onSelectMode(o.mode)}
                  className={`grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    selected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ember/50"
                  }`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${selected ? "bg-ember text-white" : "bg-mist text-ink"}`}>
                    <Icon size={22} />
                  </span>
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold">{meta.label}</span>
                      {o.mode === fastest && <Chip className={selected ? "bg-ember text-white" : ""}>Le + rapide</Chip>}
                    </span>
                    <span className={`mt-0.5 block font-mono text-[11px] tracking-wide ${selected ? "text-white/60" : "text-slate-400"}`}>
                      {formatDuration(o.durationMin).toUpperCase()} · {formatDistance(o.distanceKm)} · CO₂ {meta.co2.toUpperCase()}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="font-display text-[24px] font-bold leading-none">{o.price > 0 ? `€${o.price}` : "Gratuit"}</span>
                    <span className={`mt-1 block font-mono text-[10px] tracking-widest ${selected ? "text-white/60" : "text-slate-400"}`}>
                      {o.price > 0 ? "EST. / PERS." : ""}
                    </span>
                  </span>
                </button>
              );
            })}

          {!loading && options.length === 0 && (
            <p className="rounded-2xl bg-mist p-4 text-[14px] text-slate-500">
              Aucun itinéraire calculable pour ce trajet. Vérifiez le point de départ.
            </p>
          )}
        </div>

        {/* live detail for selected option */}
        {trainJourneys.length > 0 && (
          <div className="mt-5 rounded-2xl border border-line bg-white p-4">
            <Eyebrow tone="navy" className="mb-3">Trains disponibles · SNCF</Eyebrow>
            <div className="flex flex-col gap-2">
              {trainJourneys.slice(0, 4).map((j, i) => (
                <div key={i} className="rounded-xl bg-cloud p-3 text-[13px]">
                  <div className="font-semibold text-ink">
                    {timeOf(j.departureAt)} → {timeOf(j.arrivalAt)}
                    {j.transfers > 0 ? <span className="font-normal text-slate-500"> · {j.transfers} corresp.</span> : <span className="font-normal text-[#0d5c63]"> · direct</span>}
                  </div>
                  {j.trains[0] && (
                    <div className="mt-0.5 text-slate-500">
                      {j.trains[0].name} {j.trains[0].number} · {j.trains[0].departureStation} → {j.trains[j.trains.length - 1].arrivalStation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {flights.length > 0 && (
          <div className="mt-5 rounded-2xl border border-line bg-white p-4">
            <Eyebrow tone="navy" className="mb-3">Vols disponibles</Eyebrow>
            <div className="flex flex-col gap-2">
              {flights.slice(0, 4).map((f, i) => (
                <div key={i} className="rounded-xl bg-cloud p-3 text-[13px]">
                  <span className="font-semibold text-ink">{f.airline} {f.flightNumber}</span>
                  {f.transfers > 0 ? <span className="text-slate-500"> · {f.transfers} escale(s)</span> : <span className="text-[#0d5c63]"> · direct</span>}
                  {f.price ? <span className="float-right font-semibold text-ember-ink">€{Math.round(f.price)}</span> : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 mt-6 bg-page pt-2 pb-1">
          <Button onClick={onContinue} disabled={!selectedMode} className="w-full">
            Voir mon bundle <IconArrow size={16} />
          </Button>
        </div>
      </aside>
    </div>
  );
}
