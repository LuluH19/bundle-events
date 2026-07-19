"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { HotelsViewProps, HotelMapItem, Location } from "@/src/types";
import { getHotelDistance } from "@/src/utils/hotel";
import { formatDistance } from "@/src/utils/format";
import { getHotelBookingLink } from "@/src/utils/booking";
import {
  Eyebrow,
  IconPin,
  IconStar,
  IconCheck,
  IconClose,
  IconMap,
  IconArrow,
  IconBed,
} from "@/src/components/ui";
import { Dropdown } from "@/src/components/Dropdown";

const RADIUS_OPTIONS = [5, 10, 20, 25, 50].map((r) => ({ value: r, label: `${r} km` }));

const SORT_OPTIONS = [
  { value: "distance" as const, label: "Plus proche" },
  { value: "price-asc" as const, label: "Moins cher" },
  { value: "price-desc" as const, label: "Plus cher" },
];

const TravelMap = dynamic(() => import("@/src/components/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-mist">
      <p className="text-sm text-slate-400">Chargement de la carte…</p>
    </div>
  ),
});

const CHECKIN_TIME = "14:00";
const CHECKOUT_TIME = "11:00";

const formatPrice = (h: HotelMapItem) =>
  h.currency && h.currency !== "EUR" ? `${h.pricePerNight} ${h.currency}` : `${h.pricePerNight}€`;

const fmtStay = (iso: string, time: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00` : iso);
  if (isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return `${day} · ${time}`;
};

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
    checkin,
    checkout,
    mobileMapOpen,
    setMobileMapOpen,
    onChooseHotel,
  } = props;

  const [sortBy, setSortBy] = useState<"distance" | "price-asc" | "price-desc">("distance");
  const [modalHotel, setModalHotel] = useState<HotelMapItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openModal = (h: HotelMapItem) => {
    setModalHotel(h);
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetOpen(true)));
  };
  const closeModal = useCallback(() => {
    setSheetOpen(false);
    setTimeout(() => setModalHotel(null), 300);
  }, []);

  const confirmHotel = () => {
    if (!modalHotel) return;
    onChooseHotel(modalHotel);
  };

  useEffect(() => {
    if (!modalHotel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalHotel, closeModal]);

  const sorted = useMemo(() => {
    const arr = hotelResults.filter((h) => {
      const d = getHotelDistance(h, venue);
      return d == null || d <= hotelRadius;
    });
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
  }, [hotelResults, venue, sortBy, hotelRadius]);

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
      hotelResults={sorted}
      selectedHotelId={selectedHotel?.id ?? null}
      onHotelSelect={onSelectHotel}
      hotelRadius={hotelRadius}
      showHotels
    />
  );

  const modalHotelLocation: Location | null = modalHotel
    ? { id: modalHotel.id, name: modalHotel.name, coords: modalHotel.coords, type: "hotel", address: modalHotel.locationName }
    : null;
  const modalMapsHref = modalHotel
    ? `https://www.google.com/maps/search/?api=1&query=${modalHotel.coords.lat},${modalHotel.coords.lng}`
    : "#";
  const modalDist = modalHotel ? getHotelDistance(modalHotel, venue) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 md:h-[calc(100dvh-65px)] md:flex-row">
      <aside className="scroll-slim flex flex-col flex-1 w-full overflow-y-auto bg-page px-5 pt-5 pb-6 md:w-[560px] md:p-7">
        <Eyebrow className="mb-2">Hébergements disponibles</Eyebrow>
        <h2 className="font-display text-[30px] font-extrabold tracking-tight text-ink md:text-[40px]">
          Votre logement près de <span className="text-ember">{venue.name}</span>.
        </h2>
        <p className="mt-2 text-[14px] text-slate-500">{venue.address || venue.name}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Dropdown label="Rayon" value={hotelRadius} options={RADIUS_OPTIONS} onChange={setHotelRadius} />
          <Dropdown label="Trier" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
          <span className="text-[13px] text-slate-400">
            {hotelLoading ? "Recherche…" : `${sorted.length} hôtel${sorted.length > 1 ? "s" : ""}`}
          </span>
          <button
            onClick={() => setMobileMapOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[13px] font-medium text-white md:hidden"
          >
            <IconMap size={15} /> Carte
          </button>
        </div>

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
                            <div className="font-display text-[20px] font-bold text-ink">{formatPrice(h)}</div>
                            <div className="font-mono text-[10px] tracking-widest text-slate-400">/ NUIT</div>
                          </>
                        ) : (
                          <div className="font-mono text-[10px] tracking-widest text-slate-400">PRIX N/A</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-2">
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
                      <a
                        href={getHotelBookingLink(h, checkin, checkout).href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Vérifier la disponibilité sur Booking.com"
                        className="flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-mist"
                      >
                        Vérifier la disponibilité
                      </a>
                      <button
                        onClick={() => openModal(h)}
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
      </aside>

      <div className="hidden md:block md:flex-1">{mapBlock}</div>

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

      {modalHotel && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <div
            onClick={closeModal}
            className={`absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-300 ${
              sheetOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-page shadow-[0_-12px_48px_-12px_rgba(0,17,58,0.4)] transition-transform duration-300 ease-out md:h-[90vh] md:max-w-6xl md:flex-row ${
              sheetOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="absolute left-1/2 top-3 z-20 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/70 md:hidden" />
            <button
              onClick={closeModal}
              aria-label="Fermer"
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-md ring-1 ring-black/5 transition-colors hover:bg-mist"
            >
              <IconClose size={16} />
            </button>

            <div className="relative h-56 w-full shrink-0 overflow-hidden bg-gradient-to-br from-navy to-ink md:h-auto md:w-[46%]">
              {modalHotel.photo ? (
                <Image
                  src={modalHotel.photo}
                  alt={modalHotel.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  quality={80}
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/40">
                  <IconBed size={40} />
                </div>
              )}
              {modalHotel.pricePerNight ? (
                <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[13px] font-bold text-ember-ink shadow-md">
                  {formatPrice(modalHotel)} <span className="font-medium text-slate-400">/nuit</span>
                </span>
              ) : null}
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-28 pt-6 md:px-7">
                <h2 className="font-display text-[24px] font-extrabold leading-tight text-ink">{modalHotel.name}</h2>
                {modalHotel.locationName && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-[14px] text-slate-500">
                    <IconPin size={15} className="mt-0.5 shrink-0 text-ember" />
                    <span>{modalHotel.locationName}</span>
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="eyebrow text-slate-400">Arrivée (check-in)</p>
                    <p className="mt-1 text-[15px] font-bold text-ink">{fmtStay(checkin, CHECKIN_TIME)}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="eyebrow text-slate-400">Départ (check-out)</p>
                    <p className="mt-1 text-[15px] font-bold text-ink">{fmtStay(checkout, CHECKOUT_TIME)}</p>
                  </div>
                </div>

                {modalDist != null && (
                  <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember-soft text-ember-ink">
                      <IconPin size={18} />
                    </span>
                    <p className="text-[15px] font-bold text-ink">{formatDistance(modalDist)} de {venue.name}</p>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-ink">Localisation</h3>
                  <a
                    href={modalMapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[13px] font-semibold text-ember-ink hover:underline"
                  >
                    Agrandir <IconArrow size={13} className="-rotate-45" />
                  </a>
                </div>
                <div className="mt-2 h-44 overflow-hidden rounded-2xl bg-mist md:h-72">
                  <TravelMap
                    departure={null}
                    venue={venue}
                    hotel={modalHotelLocation}
                    route={null}
                    hotelResults={[]}
                    selectedHotelId={null}
                    onHotelSelect={() => {}}
                    hotelRadius={0}
                    showHotels={false}
                    fitPadding={40}
                  />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-page via-page to-transparent p-4">
                <button
                  onClick={confirmHotel}
                  className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-ember px-6 py-4 text-[15px] font-bold text-white shadow-[0_12px_28px_-8px_rgba(249,108,26,0.6)] transition-all hover:bg-ember-600 active:scale-[0.99]"
                >
                  Choisir ce logement et voir les transports <IconArrow size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
