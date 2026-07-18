"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { Location, RouteOption, Step, TransportMode, BundleViewProps } from "@/src/types";
import { formatDuration, formatDistance } from "@/src/utils/format";
import { MODE_META } from "@/src/utils/constants/transport";
import { getBookingLinks, getHotelBookingLink, BookingLink } from "@/src/utils/booking";
import {
  Chip,
  IconArrow,
  IconBed,
  IconCheck,
  IconLeaf,
  IconMap,
  IconPin,
  IconPlane,
  IconStar,
  IconTicket,
  MODE_ICON,
} from "@/src/components/ui";

const TravelMap = dynamic(() => import("@/src/components/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-mist">
      <p className="text-sm text-slate-400">Chargement de la carte…</p>
    </div>
  ),
});

type Leg = {
  option: RouteOption | null;
  direction: "outbound" | "return";
  title: string;
  dep: Location | null;
  arr: Location | null;
  editStep: Step;
};

/** Short mode labels used on the booking buttons (compact than MODE_META). */
const SHORT_MODE: Record<TransportMode, string> = {
  plane: "Avion",
  train: "Train",
  bus: "Bus",
  car: "Voiture",
  walking: "À pied",
};

/** A ticket can be booked for these; road/walk only get a route link. */
const isTicketed = (mode: TransportMode) => mode === "plane" || mode === "train" || mode === "bus";

export function BundleView(props: BundleViewProps) {
  const { departure, venue, dateLabel, outboundOption, returnOption, roundTrip, selectedHotel, checkin, checkout, onEdit } = props;

  const legs: Leg[] = [
    { option: outboundOption, direction: "outbound", title: "Trajet Aller", dep: departure, arr: venue, editStep: "routes-outbound" },
    roundTrip
      ? { option: returnOption, direction: "return", title: "Trajet Retour", dep: venue, arr: departure, editStep: "routes-return" }
      : null,
  ].filter(Boolean) as Leg[];

  // A round-trip flight covers both legs, so it's surfaced once in the header
  // (next to the total) rather than on the aller/retour cards.
  const flightRoundTrip: BookingLink | null =
    roundTrip && outboundOption && departure && venue
      ? getBookingLinks(outboundOption, departure, venue, checkin, { returnDateISO: checkout }).find(l => l.mode === "plane") ?? null
      : null;

  const nights = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000));
  const fmtDateTime = (iso: string) =>
    iso
      ? new Date(iso.length <= 10 ? `${iso}T00:00` : iso).toLocaleString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  const transportCost = (outboundOption?.price || 0) + (roundTrip && returnOption ? returnOption.price : 0);
  const hotelCost = selectedHotel?.pricePerNight ? selectedHotel.pricePerNight * nights : 0;
  const total = transportCost + hotelCost;
  const stars = selectedHotel?.stars ?? (selectedHotel?.rating ? Math.round(selectedHotel.rating) : 0);

  const hotelFacts: { icon: React.ReactNode; label: string }[] = [];
  if (selectedHotel) {
    if (selectedHotel.stars) hotelFacts.push({ icon: <IconStar size={18} />, label: `${selectedHotel.stars} étoiles` });
    if (selectedHotel.rating) hotelFacts.push({ icon: <IconCheck size={18} />, label: `Note ${selectedHotel.rating}` });
    if (selectedHotel.pricePerNight)
      hotelFacts.push({ icon: <IconLeaf size={18} />, label: `€${selectedHotel.pricePerNight} / nuit` });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      {/* Header */}
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Chip>Bundle Summary</Chip>
          <h1 className="font-display text-[40px] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink md:text-[56px]">
            Votre escapade,
            <br />
            <span className="text-ember">assemblée.</span>
          </h1>
          <p className="max-w-lg text-[15px] text-slate-500 md:text-[17px]">
            Toutes les étapes de votre voyage vers {venue?.name ?? "votre événement"} réuni dans un seul bundle premium.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-stretch">
          {flightRoundTrip && (
            <a
              href={flightRoundTrip.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Réserver via ${flightRoundTrip.provider}`}
              className="group flex items-center gap-4 rounded-2xl bg-ember p-6 text-white shadow-[0_18px_48px_-22px_rgba(249,108,26,0.65)] transition-all hover:bg-ember-600 active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                <IconPlane size={22} />
              </span>
              <span className="flex flex-col">
                <span className="eyebrow text-white/70">Vol aller-retour</span>
                <span className="font-display text-[19px] font-extrabold leading-tight text-white">Réserver le vol</span>
                <span className="text-[12px] text-white/70">via {flightRoundTrip.provider}</span>
              </span>
              <IconArrow size={17} className="ml-auto text-white transition-transform group-hover:translate-x-1" />
            </a>
          )}
          <div className="flex flex-col items-start justify-center rounded-2xl bg-white p-6 ring-1 ring-line md:items-end">
            <span className="eyebrow text-slate-400">Total estimé</span>
            <span className="mt-1 font-display text-[40px] font-extrabold text-ink">€{total.toLocaleString("fr-FR")}</span>
            <p className="mt-1 text-[12px] text-slate-400">Taxes et frais locaux estimés inclus</p>
          </div>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-5 md:gap-6">
        {/* Transport */}
        <section className="col-span-12 flex flex-col gap-5 lg:col-span-7">
          {legs.map((t, idx) => {
            const mode = t.option?.mode ?? null;
            const modeMeta = mode ? MODE_META[mode] : null;
            const ModeIcon = mode ? MODE_ICON[mode] : null;

            return (
              <div key={idx} className="flex flex-col overflow-hidden rounded-4xl bg-white shadow-[0_18px_48px_-24px_rgba(0,17,58,0.35)] ring-1 ring-line">
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-navy to-ink">
                  <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_-10%,rgba(249,108,26,0.35),transparent_55%)]" />
                  <div className="absolute bottom-6 left-6 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-md">
                      {ModeIcon ? <ModeIcon size={22} /> : <IconMap size={22} />}
                    </span>
                    <div>
                      <h2 className="font-display text-[22px] font-bold leading-tight text-white">
                        {t.title}
                        {t.option ? (() => {
                          const counts: Record<string, number> = { plane: 0, train: 0, bus: 0, car: 0 };
                          t.option.route.segments.forEach(seg => {
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
                          return parts.length > 0 ? ` · ${parts.join(" + ")}` : (modeMeta ? ` · ${modeMeta.label}` : "");
                        })() : ""}
                      </h2>
                      {modeMeta && <p className="text-[13px] text-white/60">{modeMeta.provider}</p>}
                    </div>
                  </div>
                </div>

                {t.option ? (() => {
                  const isReturn = t.direction === "return";
                  const dir = isReturn ? "retour" : "aller";
                  let bookingLinks = getBookingLinks(t.option, t.dep, t.arr, isReturn ? checkout : checkin);
                  // The round-trip flight lives in the header — drop it from both cards.
                  if (flightRoundTrip) {
                    bookingLinks = bookingLinks.filter(l => l.mode !== "plane");
                  }
                  const multi = bookingLinks.length > 1;
                  const labelFor = (link: BookingLink) => {
                    const short = SHORT_MODE[link.mode] + (link.roundTrip ? " A/R" : "");
                    if (multi) return `${isTicketed(link.mode) ? "Réserver" : "Itinéraire"} · ${short}`;
                    if (link.roundTrip) return "Réserver mon vol aller-retour";
                    return isTicketed(link.mode) ? `Réserver mon billet ${dir}` : `Voir mon itinéraire ${dir}`;
                  };
                  return (
                  <div className="flex grow flex-col p-7 md:p-8">
                    <div className="mb-7 grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="eyebrow text-slate-400">Départ</p>
                        <p className="truncate text-[17px] font-bold text-ink">{t.dep?.name ?? "—"}</p>
                        <p className="text-[13px] text-slate-500">{t.direction === "outbound" ? dateLabel : ""}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="eyebrow text-slate-400">Arrivée</p>
                        <p className="truncate text-[17px] font-bold text-ink">{t.arr?.name ?? "—"}</p>
                        <p className="text-[13px] text-slate-500">
                          {formatDuration(t.option.durationMin)} · {formatDistance(t.option.distanceKm)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                      <div>
                        <p className="font-display text-[24px] font-extrabold text-ink">€{t.option.price.toLocaleString("fr-FR")}</p>
                        <p className="text-[12px] text-slate-400">Prix du trajet estimé</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onEdit(t.editStep)}
                          className="flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-[14px] font-bold text-slate-600 transition-colors hover:bg-mist"
                        >
                          Modifier
                        </button>
                        {bookingLinks.map((link, i) => {
                          const LinkIcon = MODE_ICON[link.mode] ?? IconTicket;
                          return (
                            <a
                              key={i}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`${isTicketed(link.mode) ? "Réserver" : "Itinéraire"} via ${link.provider}`}
                              className="flex items-center gap-2 rounded-xl bg-ember px-5 py-3 text-[14px] font-bold text-white transition-all hover:bg-ember-600 active:scale-95"
                            >
                              <LinkIcon size={15} /> {labelFor(link)}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  );
                })() : (
                  <EmptyBlock label="Aucun trajet sélectionné" cta="Choisir un trajet" onClick={() => onEdit(t.editStep)} />
                )}
              </div>
            );
          })}
        </section>

        {/* Itineraries — one map per leg (aller + retour) */}
        <section className="col-span-12 flex flex-col gap-5 lg:col-span-5">
          {legs.map((leg, idx) => (
            <div key={idx} className="flex flex-col justify-between rounded-4xl bg-mist p-6 ring-1 ring-line">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-[18px] font-bold text-ink">
                  <IconMap size={18} className="text-ember" /> Itinéraire{roundTrip ? (leg.direction === "outbound" ? " aller" : " retour") : ""}
                </h3>
                <div className="relative h-56 overflow-hidden rounded-2xl bg-mist">
                  {leg.option ? (
                    <TravelMap
                      departure={leg.dep}
                      venue={leg.arr}
                      hotel={null}
                      route={leg.option.route}
                      hotelResults={[]}
                      selectedHotelId={null}
                      onHotelSelect={() => {}}
                      hotelRadius={0}
                      showHotels={false}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-navy to-ink text-[13px] text-white/50">
                      Aucun itinéraire sélectionné
                    </div>
                  )}
                  {/* Destination label — constrained so it never overflows the map */}
                  <div className="pointer-events-none absolute inset-x-4 bottom-4">
                    <div className="flex max-w-full items-center gap-3 rounded-2xl border border-white/40 bg-white/90 p-4 shadow-xl backdrop-blur-xl">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember text-white">
                        <IconPin size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{leg.arr?.name ?? "Destination"}</p>
                        <p className="truncate text-[12px] text-slate-500">{leg.arr?.address ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white p-4">
                  <p className="eyebrow text-slate-400">Temps de trajet</p>
                  <p className="font-display text-[18px] font-extrabold text-ink">
                    {leg.option ? formatDuration(leg.option.durationMin) : "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="eyebrow text-slate-400">Empreinte CO₂</p>
                  <p className="flex items-center gap-1.5 font-display text-[18px] font-extrabold text-ink">
                    <IconLeaf size={16} className="text-[#0d5c63]" /> {leg.option ? MODE_META[leg.option.mode].co2 : "—"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Hotel */}
        <section className="col-span-12 flex flex-col overflow-hidden rounded-4xl bg-white shadow-[0_18px_48px_-24px_rgba(0,17,58,0.35)] ring-1 ring-line md:flex-row">
          <div className="relative h-64 w-full shrink-0 overflow-hidden bg-gradient-to-br from-navy to-ink md:h-auto md:w-2/5">
            {selectedHotel?.photo ? (
              <Image
                src={selectedHotel.photo}
                alt={selectedHotel.name}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                quality={75}
                loading="lazy"
                preload={false}
                decoding="async"
                placeholder="empty"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <IconBed size={40} />
              </div>
            )}
            <div className="absolute left-6 top-6">
              <span className="rounded-full bg-ember px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg">
                Hébergement
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between p-7 md:p-10">
            {selectedHotel ? (
              <>
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="font-display text-[26px] font-extrabold leading-tight text-ink md:text-[30px]">
                        {selectedHotel.name}
                      </h2>
                      <div className="flex items-center gap-1 text-ember">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <IconStar key={i} size={16} className={i < stars ? "text-ember" : "text-line"} />
                        ))}
                        {selectedHotel.rating && (
                          <span className="ml-2 text-[13px] font-medium text-slate-400">{selectedHotel.rating} / 5</span>
                        )}
                      </div>
                      {selectedHotel.locationName && (
                        <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                          <IconPin size={14} className="shrink-0 text-ember" />
                          <span className="truncate">{selectedHotel.locationName}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[26px] font-black text-ink md:text-[30px]">
                        €{hotelCost.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        {nights} nuit{nights > 1 ? "s" : ""} {selectedHotel.type ? `· ${selectedHotel.type}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-4 border-t border-line pt-6">
                    <div className="space-y-1">
                      <p className="eyebrow text-slate-400">Aller</p>
                      <p className="text-[15px] font-bold text-ink">{fmtDateTime(checkin)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="eyebrow text-slate-400">Retour</p>
                      <p className="text-[15px] font-bold text-ink">{fmtDateTime(checkout)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="eyebrow text-slate-400">Durée</p>
                      <p className="text-[15px] font-bold text-ink">
                        {nights} nuit{nights > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {hotelFacts.length > 0 && (
                    <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {hotelFacts.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-slate-600">
                          <span className="text-ember">{f.icon}</span>
                          <span className="text-[13px]">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => onEdit("hotels")}
                    className="rounded-xl border border-line px-6 py-3.5 text-[14px] font-bold text-slate-600 transition-colors hover:bg-mist"
                  >
                    Changer d&apos;hôtel
                  </button>
                  {(() => {
                    const booking = getHotelBookingLink(selectedHotel, checkin, checkout);
                    return (
                      <a
                        href={booking.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Réserver via ${booking.provider}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-ember px-7 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-ember-600 active:scale-95"
                      >
                        Réserver l&apos;hôtel <IconArrow size={15} />
                      </a>
                    );
                  })()}
                </div>
              </>
            ) : (
              <EmptyBlock label="Aucun hôtel sélectionné" cta="Choisir un hôtel" onClick={() => onEdit("hotels")} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyBlock({ label, cta, onClick }: { label: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex grow flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-[14px] text-slate-400">{label}</p>
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-navy-700"
      >
        {cta}
        <IconArrow size={15} />
      </button>
    </div>
  );
}

function LogisticsCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl bg-mist p-6 ring-1 ring-line">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-ink">{icon}</span>
        <h4 className="font-bold text-ink">{title}</h4>
      </div>
      <p className="text-[14px] text-slate-600">{value}</p>
      <p className="mt-1 text-[12px] text-slate-400">{hint}</p>
    </div>
  );
}
