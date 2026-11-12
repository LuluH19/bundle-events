"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { HotelMapItem, Location, TripPreference } from "@/src/types";
import { getHotelDistance } from "@/src/utils/hotel";
import { formatDistance } from "@/src/utils/format";
import { pickHotel } from "@/src/utils/algorithms/recommend";
import { Dropdown } from "@/src/components/Dropdown";
import { IconBed, IconCheck, IconMap, IconStar } from "@/src/components/ui";

const TravelMap = dynamic(() => import("@/src/components/TravelMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-mist" />,
});

const RADIUS_OPTIONS = [2, 5, 10, 20, 50].map((r) => ({ value: r, label: `${r} km` }));

type Sort = "recommended" | "distance" | "price";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "Recommandé" },
  { value: "distance", label: "Plus proche" },
  { value: "price", label: "Moins cher" },
];

interface HotelPickerProps {
  hotels: HotelMapItem[];
  venue: Location | null;
  selected: HotelMapItem | null;
  preference: TripPreference;
  radius: number;
  onRadius: (r: number) => void;
  loading: boolean;
  error: string;
  onChoose: (h: HotelMapItem) => void;
}

export function walkingMinutes(km: number) {
  return Math.max(1, Math.round((km / 4.8) * 60));
}

export function HotelPicker({ hotels, venue, selected, preference, radius, onRadius, loading, error, onChoose }: HotelPickerProps) {
  const [sort, setSort] = useState<Sort>("recommended");
  const [showMap, setShowMap] = useState(false);

  const list = useMemo(() => {
    const inRadius = hotels.filter((h) => {
      const d = getHotelDistance(h, venue);
      return d == null || d <= radius;
    });
    const dist = (h: HotelMapItem) => getHotelDistance(h, venue) ?? 0;
    if (sort === "distance") return [...inRadius].sort((a, b) => dist(a) - dist(b));
    if (sort === "price") {
      return [...inRadius].sort((a, b) => (a.pricePerNight ?? Infinity) - (b.pricePerNight ?? Infinity));
    }
    const best = pickHotel(inRadius, venue?.coords ?? null, preference);
    const rest = inRadius.filter((h) => h.id !== best?.id).sort((a, b) => dist(a) - dist(b));
    return best ? [best, ...rest] : rest;
  }, [hotels, venue, radius, sort, preference]);

  const recommendedId = sort === "recommended" ? list[0]?.id : undefined;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSort(s.value)}
              aria-pressed={sort === s.value}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset ${
                sort === s.value ? "bg-nuit text-white ring-nuit" : "bg-white text-ink ring-line hover:bg-mist"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Dropdown label="Rayon" value={radius} options={RADIUS_OPTIONS} onChange={onRadius} />
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-inset ring-line hover:bg-mist"
        >
          <IconMap size={15} /> {showMap ? "Masquer la carte" : "Voir sur la carte"}
        </button>
      </div>

      {showMap && venue && (
        <div className="h-64 overflow-hidden rounded-2xl ring-1 ring-line">
          <TravelMap
            departure={null}
            venue={venue}
            hotel={null}
            route={null}
            hotelResults={list}
            selectedHotelId={selected?.id ?? null}
            onHotelSelect={onChoose}
            hotelRadius={radius}
            showHotels
            fitPadding={40}
          />
        </div>
      )}

      {loading && [0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mist" />)}

      {!loading && error && <p className="rounded-2xl bg-billet-soft p-4 text-[14px] text-ink">{error}</p>}

      {!loading && !error && list.length === 0 && (
        <p className="rounded-2xl bg-mist p-4 text-[14px] text-slate-500">Aucun hôtel dans ce rayon. Élargis le rayon.</p>
      )}

      {!loading &&
        list.map((h) => {
          const d = getHotelDistance(h, venue);
          const isSelected = selected?.id === h.id;
          return (
            <article
              key={h.id}
              className={`grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-2xl bg-white p-3 ring-inset ${
                isSelected ? "ring-2 ring-ink" : "ring-1 ring-line"
              }`}
            >
              <div className="relative h-[88px] overflow-hidden rounded-xl bg-gradient-to-br from-navy to-ink">
                {h.photo ? (
                  <Image src={h.photo} alt={h.name} fill sizes="88px" unoptimized className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-white/50">
                    <IconBed size={26} />
                  </span>
                )}
              </div>
              <div className="grid min-w-0 gap-1">
                {recommendedId === h.id && (
                  <span className="w-fit rounded-md bg-nuit-doux px-1.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
                    Recommandé
                  </span>
                )}
                <h3 className="text-[15px] font-bold leading-snug text-ink">{h.name}</h3>
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-slate-500">
                  {h.stars ? (
                    <span className="flex items-center gap-0.5 text-car" aria-label={`${h.stars} étoiles`}>
                      {Array.from({ length: h.stars }).map((_, i) => (
                        <IconStar key={i} size={11} />
                      ))}
                    </span>
                  ) : null}
                  {h.rating ? <span className="rounded bg-ok-soft px-1 font-mono font-bold text-ok">{h.rating}</span> : null}
                  {d != null && (
                    <span>
                      {d <= 2.5 ? `${walkingMinutes(d)} min à pied` : formatDistance(d)} de la salle
                    </span>
                  )}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[15px] font-bold text-ink">
                    {h.pricePerNight ? `${h.pricePerNight} €` : "Prix indisponible"}
                    {h.pricePerNight ? <span className="text-[12px] font-medium text-slate-500"> / nuit</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChoose(h)}
                    disabled={isSelected}
                    className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-semibold ${
                      isSelected ? "bg-ok-soft text-ok" : "bg-ink text-white hover:bg-navy-700"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <IconCheck size={14} /> Choisi
                      </>
                    ) : (
                      "Choisir"
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
    </div>
  );
}
