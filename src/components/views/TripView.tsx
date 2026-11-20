"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import type { FlightInfo, RouteOption, TrainJourney, TripPreference, TripViewProps } from "@/src/types";
import { getHotelDistance } from "@/src/utils/hotel";
import { formatDistance } from "@/src/utils/format";
import { formatDay } from "@/src/utils/date";
import { LegFacts, SegmentList, TrainTimes } from "@/src/components/trip/Leg";
import { StepsColumn, StepsInline } from "@/src/components/trip/Steps";
import { TripMap, TripMapDialog } from "@/src/components/trip/TripMap";
import { PREFERENCE_LABEL } from "@/src/components/trip/OptionList";
import { walkingMinutes } from "@/src/components/trip/HotelPicker";
import { IconArrow, IconBed, IconInfo, IconMap, IconStar } from "@/src/components/ui";

const PREFERENCES: TripPreference[] = ["fast", "cheap", "green"];

function LegBlock({
  kind,
  date,
  option,
  loading,
  journeys,
  flights,
  onChange,
}: {
  kind: string;
  date: string;
  option: RouteOption | null;
  loading: boolean;
  journeys: TrainJourney[];
  flights: FlightInfo[];
  onChange: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
        <span className="eyebrow text-slate-500">
          {kind} · {date}
        </span>
        <button type="button" onClick={onChange} className="text-[14px] font-semibold text-ink underline underline-offset-4">
          Changer
        </button>
      </div>
      <div className="px-4 pb-4 pt-2">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-mist" />
        ) : option ? (
          <LegFacts option={option} journey={option.mode === "train" ? journeys[0] : undefined} />
        ) : (
          <p className="text-[14px] text-slate-500">Aucun trajet trouvé. Touche « Changer » pour voir les options.</p>
        )}
      </div>
      {option && !loading && (
        <details className="group border-t border-line">
          <summary className="flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-ink">
            Détail du trajet
            <span className="text-slate-400 transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="grid gap-3 px-4 pb-4">
            <SegmentList option={option} flights={flights} />
            {option.mode === "train" && <TrainTimes journeys={journeys} />}
          </div>
        </details>
      )}
      {option && !loading && (
        <div className="flex items-center justify-between border-t border-line bg-page px-4 py-2.5 text-[13px] text-slate-500">
          <span>Prix estimé</span>
          <span className="font-display text-[18px] font-extrabold text-ink">{option.price} €</span>
        </div>
      )}
    </section>
  );
}

function HotelBlock({ trip, onChange }: { trip: TripViewProps["trip"]; onChange: () => void }) {
  const h = trip.hotel;
  const d = h ? getHotelDistance(h, trip.venue) : null;
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
        <span className="eyebrow text-slate-500">
          Nuit · {trip.nights} nuit{trip.nights > 1 ? "s" : ""}
        </span>
        <button type="button" onClick={onChange} className="text-[14px] font-semibold text-ink underline underline-offset-4">
          Changer
        </button>
      </div>
      {trip.hotelLoading && !h ? (
        <div className="m-4 h-24 animate-pulse rounded-xl bg-mist" />
      ) : h ? (
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-4">
          <div className="relative h-24 overflow-hidden rounded-xl bg-gradient-to-br from-navy to-ink">
            {h.photo ? (
              <Image src={h.photo} alt={h.name} fill sizes="96px" unoptimized className="object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-white/50">
                <IconBed size={26} />
              </span>
            )}
          </div>
          <div className="grid min-w-0 content-start gap-1">
            <h3 className="text-[16px] font-bold leading-snug text-ink">{h.name}</h3>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-slate-500">
              {h.stars ? (
                <span className="flex items-center gap-0.5 text-car" aria-label={`${h.stars} étoiles`}>
                  {Array.from({ length: h.stars }).map((_, i) => (
                    <IconStar key={i} size={11} />
                  ))}
                </span>
              ) : null}
              {h.rating ? <span className="rounded bg-ok-soft px-1 font-mono font-bold text-ok">{h.rating}</span> : null}
              {d != null && <span>{d <= 2.5 ? `${walkingMinutes(d)} min à pied` : formatDistance(d)} de la salle</span>}
            </p>
            <p className="text-[13px] text-slate-500">
              {h.pricePerNight ? (
                <>
                  <span className="font-bold text-ink">{h.pricePerNight} €</span> la nuit
                </>
              ) : (
                "Prix indisponible"
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 p-4">
          <p className="text-[14px] text-slate-500">{trip.hotelError || "Aucun hôtel choisi pour l'instant."}</p>
          <button type="button" onClick={onChange} className="w-fit rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white">
            Voir les hôtels
          </button>
        </div>
      )}
    </section>
  );
}

// TODO #137 : inutilisé tant que withHotel est forcé à true dans BundleBuilder.
function DayTripNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-line bg-white p-4 text-[14px] text-slate-500">
      <IconInfo size={18} className="mt-0.5 shrink-0" />
      <span>Aller-retour dans la journée : pas besoin d&apos;hôtel.</span>
    </div>
  );
}

function TotalCard({ trip, onBook }: { trip: TripViewProps["trip"]; onBook: () => void }) {
  const parts = [`Aller ${trip.total.outbound} €`];
  if (trip.withHotel && trip.hotel) parts.push(`Hôtel ${trip.total.hotel} €`);
  if (trip.roundTrip) parts.push(`Retour ${trip.total.ret} €`);
  return (
    <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
      <div className="flex items-center gap-4">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[12px] text-slate-500">Total estimé</span>
          <span className="font-display text-[28px] font-extrabold leading-none text-ink">{trip.total.total}&nbsp;€</span>
        </div>
        <button
          type="button"
          onClick={onBook}
          className="flex h-12 items-center gap-2 rounded-xl bg-billet px-6 text-[16px] font-bold text-white transition-colors hover:bg-billet-600"
        >
          Réserver <IconArrow size={16} />
        </button>
      </div>
      <p className="flex flex-wrap gap-x-1.5 border-t border-line pt-2.5 text-[13px] text-slate-500">
        {parts.map((p, i) => (
          <span key={p} className="whitespace-nowrap">
            {i > 0 && "· "}
            {p}
          </span>
        ))}
      </p>
    </div>
  );
}

export function TripView({ trip, onGo, onOpenPanel, onPreference }: TripViewProps) {
  const title = `${trip.departure?.name ?? "Départ"} → ${trip.venue?.name ?? "Événement"}`;
  const subtitles = {
    home: title,
    trip: trip.withHotel ? (trip.roundTrip ? "Hôtel, aller et retour" : "Hôtel et aller") : "Aller et retour",
    book: `${1 + (trip.withHotel ? 1 : 0) + (trip.roundTrip ? 1 : 0)} réservations`,
  };
  const [mapOpen, setMapOpen] = useState(false);
  const closeMap = useCallback(() => setMapOpen(false), []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:pb-12 lg:pt-8">
      <div className="grid content-start gap-4">
        <div className="lg:hidden">
          <StepsInline current="trip" onGo={onGo} />
        </div>

        <div className="grid gap-1">
          <h1 className="font-display text-[26px] font-extrabold leading-tight text-ink md:text-[34px]">{title}</h1>
          <p className="text-[14px] text-slate-500">{trip.dateLabel} · 1 voyageur</p>
          <button type="button" onClick={() => onGo("home")} className="w-fit text-[14px] font-semibold text-ink underline underline-offset-4">
            Modifier la recherche
          </button>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Priorité">
          {PREFERENCES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPreference(p)}
              aria-pressed={trip.preference === p}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold ring-1 ring-inset ${
                trip.preference === p ? "bg-nuit text-white ring-nuit" : "bg-white text-ink ring-line hover:bg-mist"
              }`}
            >
              {PREFERENCE_LABEL[p]}
            </button>
          ))}
        </div>

        <LegBlock
          kind="Aller"
          date={formatDay(trip.checkin)}
          option={trip.outbound}
          loading={trip.optionsLoading}
          journeys={trip.outboundTrains}
          flights={trip.outboundFlights}
          onChange={() => onOpenPanel("outbound")}
        />

        {trip.withHotel ? <HotelBlock trip={trip} onChange={() => onOpenPanel("hotel")} /> : <DayTripNote />}

        {trip.roundTrip && (
          <LegBlock
            kind="Retour"
            date={formatDay(trip.returnDate)}
            option={trip.ret}
            loading={trip.optionsLoading}
            journeys={trip.returnTrains}
            flights={trip.returnFlights}
            onChange={() => onOpenPanel("return")}
          />
        )}

        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold text-ink ring-1 ring-line lg:hidden"
        >
          <IconMap size={16} /> Voir sur la carte
        </button>
      </div>

      <aside className="hidden lg:grid lg:sticky lg:top-24 lg:content-start lg:gap-4 lg:self-start">
        <StepsColumn current="trip" onGo={onGo} subtitles={subtitles} />
        <TotalCard trip={trip} onBook={() => onGo("book")} />
        <TripMap trip={trip} onExpand={() => setMapOpen(true)} />
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="grid">
            <span className="text-[12px] text-slate-500">Total estimé</span>
            <span className="font-display text-[24px] font-extrabold leading-none text-ink">{trip.total.total} €</span>
          </div>
          <button
            type="button"
            onClick={() => onGo("book")}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-billet text-[16px] font-bold text-white"
          >
            Réserver <IconArrow size={16} />
          </button>
        </div>
      </div>
      {mapOpen && <TripMapDialog trip={trip} onClose={closeMap} />}
    </div>
  );
}
