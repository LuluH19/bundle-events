"use client";

import dynamic from "next/dynamic";
import { RoutesViewProps } from "@/src/types";
import { MODE_META } from "@/src/utils/constants/transport";
import { formatDuration, formatDistance } from "@/src/utils/format";
import { Button, Chip, Eyebrow, MODE_ICON, IconArrow } from "@/src/components/ui";

const TravelMap = dynamic(() => import("@/src/components/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-mist">
      <p className="text-sm text-slate-400">Chargement de la carte…</p>
    </div>
  ),
});

export function RoutesView(props: RoutesViewProps) {
  const {
    departure,
    venue,
    options,
    loading,
    selectedModeId,
    onSelectMode,
    trainJourneys,
    flights,
    journeyRoute,
    onContinue,
  } = props;
  const fastest = options[0]?.mode;

  return (
    <div className="flex flex-col flex-1 min-h-0 md:h-[calc(100dvh-65px)] md:flex-row-reverse">
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
      <aside className="scroll-slim flex flex-col flex-1 w-full overflow-y-auto border-line bg-page p-5 md:w-[460px] md:border-r md:p-7">
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
        <div className="mt-6 flex flex-col gap-3">
          {loading &&
            [0, 1, 2].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-mist" />)}

          {!loading &&
            options.map((o) => {
              const Icon = MODE_ICON[o.mode];
              const meta = MODE_META[o.mode];
              const selected = o.id === selectedModeId;
              
              return (
                <button
                  key={o.id}
                  onClick={() => onSelectMode(o.id)}
                  className={`flex flex-col items-stretch gap-0 rounded-2xl border p-4 text-left transition-all ${
                    selected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ember/50"
                  }`}
                >
                  <div className="grid w-full grid-cols-[48px_1fr] items-center gap-3">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-ember text-white" : "bg-mist text-ink"}`}>
                      <Icon size={22} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold">
                          {(() => {
                            const counts: Record<string, number> = { plane: 0, train: 0, bus: 0, car: 0 };
                            o.route.segments.forEach(seg => {
                              if (counts[seg.mode] !== undefined) counts[seg.mode]++;
                            });
                            
                            const parts: string[] = [];
                            const order = ["plane", "train", "bus", "car"];
                            
                            order.forEach(m => {
                              const c = counts[m];
                              if (c > 0) {
                                let name = MODE_META[m as keyof typeof MODE_META].label;
                                if (c === 1) {
                                  parts.push(name);
                                } else {
                                  if (name === "Train") name = "Trains";
                                  if (name === "Avion") name = "Avions";
                                  if (name === "Voiture") name = "Voitures";
                                  parts.push(`${c} ${name}`);
                                }
                              }
                            });
                            return parts.length > 0 ? parts.join(" + ") : meta.label;
                          })()}
                        </span>
                        {o.mode === fastest && !o.accessMode && <Chip className={selected ? "bg-ember text-white" : ""}>Le + rapide</Chip>}
                      </span>
                      <span className={`mt-0.5 block truncate font-mono text-[11px] tracking-wide ${selected ? "text-white/60" : "text-slate-400"}`}>
                        {formatDuration(o.durationMin).toUpperCase()} · {formatDistance(o.distanceKm)} · CO₂ {meta.co2.toUpperCase()}
                      </span>
                    </span>
                  </div>

                  {selected && o.route.segments.length > 0 && (
                    <div className="mt-4 flex w-full flex-col gap-0 border-t border-white/20 pt-4 text-[13px]">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/50">Détail de l&apos;itinéraire</div>
                      {o.route.segments.map((seg, idx) => {
                        const SegIcon = MODE_ICON[seg.mode];
                        let displayLabel = seg.label || "";
                        if (!displayLabel) {
                          if (seg.mode === "plane" && flights.length > 0) {
                            displayLabel = `${flights[0].airline} ${flights[0].flightNumber}`;
                          } else if (seg.mode === "bus") {
                            displayLabel = "Opérateur local";
                          } else if (seg.mode === "train" && trainJourneys.length > 0) {
                            const train = trainJourneys[0].trains[0];
                            if (train) displayLabel = `${train.name} ${train.number}`;
                          }
                        }

                        const getLineColor = () => {
                          if (seg.color) return seg.color;
                          switch (seg.mode) {
                            case "walking": return "#94a3b8";
                            case "car": return "#64748b";
                            case "bus": return "#0d5c63";
                            case "plane": return "#0ea5e9";
                            case "train": return "#9f4200";
                            default: return "#0e3c60";
                          }
                        };
                        const color = getLineColor();

                        return (
                          <div key={idx} className="flex gap-4">
                            <div className="flex w-4 flex-col items-center">
                              <div className="z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20">
                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                              </div>
                              <div className="my-1 w-[2px] flex-1" style={{ backgroundColor: color }} />
                            </div>
                            <div className="mb-4 flex-1">
                              <div className="font-semibold text-white">{seg.from.name}</div>
                              <div className="mt-1.5 flex items-center gap-2 text-white/70">
                                <span className="flex items-center justify-center rounded p-1" style={{ backgroundColor: color, color: "#fff" }}>
                                  <SegIcon size={12} />
                                </span>
                                <span className="font-mono text-[10px]">
                                  {MODE_META[seg.mode].label}{displayLabel ? ` · ${displayLabel}` : ""} · {formatDuration(seg.durationMinutes)} · {formatDistance(seg.distanceKm)}
                                </span>
                              </div>
                              {idx === o.route.segments.length - 1 && (
                                <div className="mt-4 flex items-center gap-4">
                                  <div className="-ml-8 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ember">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                  </div>
                                  <div className="font-semibold text-ember">{seg.to.name}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}

          {!loading && options.length === 0 && (
            <p className="rounded-2xl bg-mist p-4 text-[14px] text-slate-500">
              Aucun itinéraire calculable pour ce trajet. Vérifiez le point de départ.
            </p>
          )}
        </div>

        {/* {trainJourneys.length > 0 && (
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
        )} */}

        <div className="sticky z-10 bottom-0 mt-auto pt-2 pb-1 flex flex-col gap-2">
          <Button onClick={onContinue} disabled={!selectedModeId && selectedModeId !== "skip"} className="w-full">
            Continuer <IconArrow size={16} />
          </Button>
          <Button kind="ghost" onClick={() => { onSelectMode("skip"); onContinue(); }} className="w-full">
            Passer cette étape
          </Button>
        </div>
      </aside>
    </div>
  );
}
