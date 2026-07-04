"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { HotelsViewProps } from "@/src/types";
import { getHotelDistance } from "@/src/utils/hotel";
import { formatDistance } from "@/src/utils/format";
import {
  Button,
  Eyebrow,
  IconPin,
  IconStar,
  IconCheck,
  IconClose,
  IconMap,
  IconArrow,
} from "@/src/components/ui";

const RADIUS_OPTIONS = [5, 10, 20, 25, 50];

const TravelMap = dynamic(() => import("@/src/components/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-mist">
      <p className="text-sm text-slate-400">Chargement de la carte…</p>
    </div>
  ),
});



export function HotelsView(props: HotelsViewProps) {
  const {
    venue,
    hotelRadius,
    setHotelRadius,
    hotelResults,
    hotelLoading,
    hotelError,
    selectedHotel,
    onSelectHotel,
    departure,
    hotelLocation,
    mobileMapOpen,
    setMobileMapOpen,
    onContinue,
  } = props;

  const [sortBy, setSortBy] = useState<"distance" | "price-asc" | "price-desc">("distance");

  const sorted = useMemo(() => {
    const arr = [...hotelResults];
    if (sortBy === "price-asc" || sortBy === "price-desc") {
      return arr.sort((a, b) => {
        const pa = a.pricePerNight;
        const pb = b.pricePerNight;
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return sortBy === "price-asc" ? pa - pb : pb - pa;
      });
    }
    return arr.sort((a, b) => {
      const da = getHotelDistance(a, venue) ?? 0;
      const db = getHotelDistance(b, venue) ?? 0;
      return da - db;
    });
  }, [hotelResults, venue, sortBy]);

  if (!venue) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h2 className="font-display text-[28px] font-bold text-ink">Choisissez d&apos;abord un événement</h2>
        <p className="mt-2 text-slate-500">On affichera les hôtels à distance de marche de la scène.</p>
      </div>
    );
  }

  const mapBlock = (
    <TravelMap
      departure={departure}
      venue={venue}
      hotel={hotelLocation}
      route={null}
      hotelResults={hotelResults}
      selectedHotelId={selectedHotel?.id ?? null}
      onHotelSelect={onSelectHotel}
      hotelRadius={hotelRadius}
      showHotels
    />
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 md:h-[calc(100dvh-65px)] md:flex-row">
      {/* List */}
      <aside className="scroll-slim flex flex-col flex-1 w-full overflow-y-auto bg-page px-5 pt-5 pb-28 md:w-[560px] md:p-7">
        <Eyebrow className="mb-2">Hébergements disponibles</Eyebrow>
        <h2 className="font-display text-[30px] font-extrabold tracking-tight text-ink md:text-[40px]">
          Votre base près de <span className="text-ember">{venue.name}</span>.
        </h2>
        <p className="mt-2 text-[14px] text-slate-500">{venue.address || venue.name}</p>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 ring-1 ring-line">
            <span className="text-[12px] font-medium text-slate-500">Rayon</span>
            <select
              value={hotelRadius}
              onChange={(e) => setHotelRadius(Number(e.target.value))}
              className="bg-transparent text-[13px] font-semibold text-ink outline-none"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 ring-1 ring-line">
            <span className="text-[12px] font-medium text-slate-500">Trier</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "distance" | "price-asc" | "price-desc")}
              className="bg-transparent text-[13px] font-semibold text-ink outline-none"
            >
              <option value="distance">Plus proche</option>
              <option value="price-asc">Moins cher</option>
              <option value="price-desc">Plus cher</option>
            </select>
          </div>
          <span className="text-[13px] text-slate-400">
            {hotelLoading ? "Recherche…" : `${hotelResults.length} hôtel${hotelResults.length > 1 ? "s" : ""}`}
          </span>
          <button
            onClick={() => setMobileMapOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[13px] font-medium text-white md:hidden"
          >
            <IconMap size={15} /> Carte
          </button>
        </div>

        {/* Cards */}
        <div className="mt-5 flex flex-col gap-4">
          {hotelLoading &&
            [0, 1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-mist" />)}

          {!hotelLoading && hotelError && (
            <p className="rounded-2xl bg-ember-soft/60 p-4 text-[14px] text-ember-ink">{hotelError}</p>
          )}

          {!hotelLoading &&
            sorted.map((h) => {
              const selected = selectedHotel?.id === h.id;
              const dist = getHotelDistance(h, venue);
              return (
                <div
                  key={h.id}
                  className={`flex flex-col gap-4 rounded-2xl border bg-white p-3 transition-all md:flex-row ${
                    selected ? "border-ember ring-1 ring-ember" : "border-line hover:border-ember/40"
                  }`}
                >
                  <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-navy to-ink md:h-24 md:w-28">
                    {h.photo ? (
                      <Image
                        src={h.photo}
                        alt={h.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 112px"
                        quality={75}
                        loading="lazy"
                        preload={false}
                        decoding="async"
                        placeholder="empty"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/40">
                        <IconPin size={22} />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[17px] font-bold text-ink">{h.name}</h3>
                        {h.locationName && <p className="mt-0.5 truncate text-[12px] text-slate-400">{h.locationName}</p>}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500">
                          {h.stars ? (
                            <span className="flex items-center gap-0.5 text-ember-ink">
                              <IconStar size={12} /> {h.stars}
                            </span>
                          ) : h.rating ? (
                            <span className="flex items-center gap-0.5 text-ember-ink">
                              <IconStar size={12} /> {h.rating}
                            </span>
                          ) : null}
                          {dist != null && <span>{formatDistance(dist)} de l&apos;événement</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {h.pricePerNight ? (
                          <>
                            <div className="font-display text-[20px] font-bold text-ink">
                              {h.currency === "EUR" || !h.currency ? "€" : h.currency}
                              {h.pricePerNight}
                            </div>
                            <div className="font-mono text-[10px] tracking-widest text-slate-400">/ NUIT</div>
                          </>
                        ) : (
                          <div className="font-mono text-[10px] tracking-widest text-slate-400">PRIX N/A</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                      {(h.website || h.phone) && (
                        <a
                          href={h.website || `tel:${h.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-ink"
                        >
                          {h.website ? "Site web" : "Appeler"}
                        </a>
                      )}
                      <button
                        onClick={() => onSelectHotel(selected ? null : h)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors md:flex-none ${
                          selected ? "bg-ember text-white" : "bg-ink text-white hover:bg-navy-700"
                        }`}
                      >
                        {selected ? (
                          <>
                            <IconCheck size={14} /> Choisi
                          </>
                        ) : (
                          "Sélectionner"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          {!hotelLoading && !hotelError && sorted.length === 0 && (
            <p className="rounded-2xl bg-mist p-4 text-[14px] text-slate-500">Aucun hôtel dans ce rayon.</p>
          )}
        </div>

        <div className="mt-auto px-5 py-3 md:sticky md:inset-x-auto md:bottom-0 md:z-auto md:mt-6 md:border-0 md:px-0 md:py-1 md:pt-2">
          <Button onClick={onContinue} disabled={!selectedHotel} className="w-full">
            {selectedHotel ? "Voir mon bundle" : "Choisissez un hôtel"} <IconArrow size={16} />
          </Button>
        </div>
      </aside>

      {/* Map (desktop) */}
      <div className="hidden md:block md:flex-1">{mapBlock}</div>

      {/* Map (mobile overlay) */}
      {mobileMapOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display font-bold text-ink">Carte des hôtels</span>
            <button onClick={() => setMobileMapOpen(false)} className="text-slate-500">
              <IconClose size={20} />
            </button>
          </div>
          <div className="flex-1">{mapBlock}</div>
        </div>
      )}
    </div>
  );
}
