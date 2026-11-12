"use client";

import Image from "next/image";
import posthog from "posthog-js";
import type { BookingKey, BookViewProps, HotelMapItem, RouteOption, TripSummary } from "@/src/types";
import { getBookingLinks, getHotelBookingLink, type BookingLink } from "@/src/utils/booking";
import { formatDay } from "@/src/utils/date";
import { MODE_COLOR } from "@/src/utils/constants/transport";
import { getHotelDistance } from "@/src/utils/hotel";
import { formatDistance, formatDuration } from "@/src/utils/format";
import { LegFacts, ModeChip } from "@/src/components/trip/Leg";
import { PREFERENCE_LABEL } from "@/src/components/trip/OptionList";
import { walkingMinutes } from "@/src/components/trip/HotelPicker";
import { StepsColumn, StepsInline } from "@/src/components/trip/Steps";
import { TripMap } from "@/src/components/trip/TripMap";
import { IconBed, IconBus, IconCheck, IconChevron, IconExternal, IconShare, IconStar, IconTrain, MODE_ICON } from "@/src/components/ui";

type LegItem = {
  key: "outbound" | "return";
  kind: string;
  date: string;
  option: RouteOption;
  links: BookingLink[];
  includedInRoundTrip: boolean;
};

const TICKETED = new Set(["plane", "train", "bus"]);

function legLinks(trip: TripSummary): { outbound: BookingLink[]; ret: BookingLink[]; roundTripModes: Set<string> } {
  const { outbound, ret, departure, venue, checkin, returnDate, roundTrip } = trip;
  if (!outbound) return { outbound: [], ret: [], roundTripModes: new Set() };
  const retLinks = roundTrip && ret ? getBookingLinks(ret, venue, departure, returnDate) : [];
  const retModes = new Set(retLinks.map((l) => l.mode));
  const combined =
    roundTrip && ret ? getBookingLinks(outbound, departure, venue, checkin, { returnDateISO: returnDate }).filter((l) => l.roundTrip && retModes.has(l.mode)) : [];
  const roundTripModes = new Set<string>(combined.map((l) => l.mode));
  const single = getBookingLinks(outbound, departure, venue, checkin).filter((l) => !roundTripModes.has(l.mode));
  return {
    outbound: [...combined, ...single],
    ret: retLinks.filter((l) => !roundTripModes.has(l.mode)),
    roundTripModes,
  };
}

function ActionLinks({
  links,
  booked,
  onOpened,
  bookable,
}: {
  links: BookingLink[];
  booked: boolean;
  onOpened: (l: BookingLink) => void;
  bookable?: boolean;
}) {
  return (
    <>
      {links.map((l, i) => {
        const primary = i === 0 && !booked;
        const verb = bookable || TICKETED.has(l.mode) ? (booked ? "Revoir sur" : "Réserver sur") : "Itinéraire sur";
        return (
          <a
            key={`${l.provider}-${l.mode}`}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpened(l)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-center text-[15px] font-bold transition-colors ${
              primary ? "bg-billet text-white hover:bg-billet-600" : "bg-white text-ink ring-1 ring-inset ring-line hover:bg-mist"
            }`}
          >
            {verb} {l.provider}
            {l.roundTrip ? " (aller-retour)" : ""} <IconExternal size={15} />
          </a>
        );
      })}
    </>
  );
}

function BookedToggle({ booked, onToggle }: { booked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={booked}
      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold ${
        booked ? "bg-ok-soft text-ok ring-1 ring-ok" : "border border-dashed border-line text-slate-500 hover:text-ink"
      }`}
    >
      {booked ? (
        <>
          <IconCheck size={14} /> Réservé
        </>
      ) : (
        "J'ai réservé"
      )}
    </button>
  );
}

function CardTop({
  icon,
  color,
  title,
  subtitle,
  booked,
  onEdit,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  booked: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 pt-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}1f` }}>
        {icon}
      </span>
      <span className="grid min-w-0 flex-1">
        <b className="text-[15px] text-ink">{title}</b>
        <span className="text-[12px] text-slate-500">{subtitle}</span>
      </span>
      {booked ? (
        <span className="flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-[12px] font-bold text-ok">
          <IconCheck size={13} /> Réservé
        </span>
      ) : (
        <button type="button" onClick={onEdit} className="text-[14px] font-semibold text-ink underline underline-offset-4">
          Modifier
        </button>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-fit rounded-md bg-nuit-doux px-1.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">{children}</span>
  );
}

function LegCard({
  item,
  trip,
  booked,
  onToggle,
  onEdit,
}: {
  item: LegItem;
  trip: TripSummary;
  booked: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { option } = item;
  const journeys = item.key === "outbound" ? trip.outboundTrains : trip.returnTrains;
  const Icon = option.mode === "bus" ? IconBus : option.mode === "train" ? IconTrain : MODE_ICON[option.mode];
  const color = MODE_COLOR[option.mode];
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl bg-white ${booked ? "ring-2 ring-ok" : "ring-1 ring-line"}`}>
      {option.mode === "train" && (
        <div className="relative h-28 w-full">
          <Image src="/images/tgv.jpg" alt="TGV en circulation" fill sizes="(min-width: 1024px) 320px, 100vw" className="object-cover" />
        </div>
      )}
      <CardTop
        icon={<Icon size={20} />}
        color={color}
        title={item.kind}
        subtitle={item.date}
        booked={booked}
        onEdit={onEdit}
      />
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-2">
        <Badge>{trip.preference ? PREFERENCE_LABEL[trip.preference] : "Ton choix"}</Badge>
        <LegFacts option={option} journey={option.mode === "train" ? journeys[0] : undefined} />
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="font-display text-[22px] font-extrabold text-ink">{option.price} €</span>
          <span className="text-[12px] text-slate-500">Prix estimé · vendu par {item.links[0]?.provider ?? "le transporteur"}</span>
        </div>
        <div className="mt-auto grid gap-2 pt-2">
          {item.includedInRoundTrip ? (
            <p className="rounded-xl bg-page px-3 py-2.5 text-[13px] text-slate-500">
              Inclus dans la réservation aller-retour de la carte Aller.
            </p>
          ) : (
            <ActionLinks
              links={item.links}
              booked={booked}
              onOpened={(l) =>
                posthog.capture("transport_booking_opened", {
                  booking_type: l.roundTrip ? "round_trip" : "one_way",
                  direction: item.key,
                  provider: l.provider,
                  transport_mode: l.mode,
                })
              }
            />
          )}
          <BookedToggle booked={booked} onToggle={onToggle} />
        </div>
      </div>
    </article>
  );
}

function HotelCard({
  hotel,
  trip,
  booked,
  onToggle,
  onEdit,
}: {
  hotel: HotelMapItem;
  trip: TripSummary;
  booked: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const d = getHotelDistance(hotel, trip.venue);
  const link = getHotelBookingLink(hotel, trip.checkin, trip.stayCheckout, { adults: 1 });
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl bg-white ${booked ? "ring-2 ring-ok" : "ring-1 ring-line"}`}>
      <div className="relative h-28 w-full bg-gradient-to-br from-navy to-ink">
        {hotel.photo ? (
          <Image src={hotel.photo} alt={hotel.name} fill sizes="(min-width: 1024px) 320px, 100vw" unoptimized className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-white/50">
            <IconBed size={30} />
          </span>
        )}
      </div>
      <CardTop
        icon={<IconBed size={20} />}
        color="#45465f"
        title="Nuit"
        subtitle={`${formatDay(trip.checkin)} → ${formatDay(trip.stayCheckout)}`}
        booked={booked}
        onEdit={onEdit}
      />
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-2">
        <Badge>{trip.preference ? PREFERENCE_LABEL[trip.preference] : "Ton choix"}</Badge>
        <h3 className="text-[17px] font-bold leading-snug text-ink">{hotel.name}</h3>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-slate-500">
          {hotel.stars ? (
            <span className="flex items-center gap-0.5 text-car" aria-label={`${hotel.stars} étoiles`}>
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <IconStar key={i} size={11} />
              ))}
            </span>
          ) : null}
          {hotel.rating ? <span className="rounded bg-ok-soft px-1 font-mono font-bold text-ok">{hotel.rating}</span> : null}
          {d != null && <span>{d <= 2.5 ? `${walkingMinutes(d)} min à pied` : formatDistance(d)} de la salle</span>}
        </p>
        <div className="grid grid-cols-2 gap-2 text-[12px] text-slate-500">
          <div className="rounded-xl bg-page px-3 py-2">
            Arrivée<b className="block text-[14px] text-ink">{formatDay(trip.checkin)}</b>dès 14:00
          </div>
          <div className="rounded-xl bg-page px-3 py-2">
            Départ<b className="block text-[14px] text-ink">{formatDay(trip.stayCheckout)}</b>avant 11:00
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="font-display text-[22px] font-extrabold text-ink">
            {hotel.pricePerNight ? `${trip.total.hotel} €` : "—"}
            {hotel.pricePerNight && trip.nights > 1 ? (
              <span className="font-sans text-[12px] font-medium text-slate-500"> pour {trip.nights} nuits</span>
            ) : null}
          </span>
          <span className="text-[12px] text-slate-500">Vendu par {link.provider}</span>
        </div>
        <div className="mt-auto grid gap-2 pt-2">
          <ActionLinks
            links={[{ href: link.href, provider: link.provider, external: true, mode: "walking" }]}
            booked={booked}
            bookable
            onOpened={(l) => posthog.capture("hotel_booking_opened", { provider: l.provider })}
          />
          <BookedToggle booked={booked} onToggle={onToggle} />
        </div>
      </div>
    </article>
  );
}

function EventCard({ trip, onEditDates, wide }: { trip: TripSummary; onEditDates: () => void; wide: boolean }) {
  const parts = [`Aller ${trip.total.outbound} €`];
  if (trip.withHotel && trip.hotel) parts.push(`Hôtel ${trip.total.hotel} €`);
  if (trip.roundTrip) parts.push(`Retour ${trip.total.ret} €`);
  return (
    <article className={`relative flex min-h-64 flex-col overflow-hidden rounded-2xl bg-nuit p-5 text-white ${wide ? "md:col-span-2" : ""}`}>
      <Image src="/images/concert-crowd.jpg" alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" priority />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,21,58,0.75)_0%,rgba(22,21,58,0.2)_45%,rgba(22,21,58,0.92)_88%)]" />
      <div className="relative grid gap-1.5">
        <span className="eyebrow text-white/70">L&apos;événement</span>
        <h2 className="font-display text-[24px] font-extrabold leading-tight">{trip.venue?.name ?? "Ton événement"}</h2>
        <p className="text-[14px] text-white/75">
          {trip.dateLabel} · depuis {trip.departure?.name ?? "ton départ"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold ring-1 ring-white/30">
            {trip.preference ? `Ton choix : ${PREFERENCE_LABEL[trip.preference].toLowerCase()}` : "Choix personnalisé"}
          </span>
          <button type="button" onClick={onEditDates} className="text-[14px] font-semibold underline underline-offset-4">
            Modifier les dates
          </button>
        </div>
      </div>
      <div className="relative mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-white/20 pt-3 text-[13px] text-white/75">
        {parts.map((p, i) => (
          <span key={p} className="flex items-baseline gap-2 whitespace-nowrap">
            {i > 0 && <span className="opacity-70">+</span>}
            {p}
          </span>
        ))}
        <span className="opacity-70">=</span>
        <b className="font-display text-[26px] font-extrabold text-white">{trip.total.total} €</b>
      </div>
    </article>
  );
}

function compactModes(option: RouteOption): RouteOption["mode"][] {
  const modes: RouteOption["mode"][] = [];
  option.route.segments.forEach((seg) => {
    if (seg.mode === "walking" && seg.durationMinutes <= 0) return;
    if (modes[modes.length - 1] !== seg.mode) modes.push(seg.mode);
  });
  return modes;
}

function RoadmapLeg({ option, from, to }: { option: RouteOption; from: string; to: string }) {
  return (
    <details className="group rounded-xl bg-page">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink">
          <span className="break-words">{from}</span>
          {compactModes(option).map((m, i) => {
            const Icon = MODE_ICON[m];
            return (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-slate-400">→</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ backgroundColor: MODE_COLOR[m] }}>
                  <Icon size={14} />
                </span>
              </span>
            );
          })}
          <span className="text-slate-400">→</span>
          <span className="break-words">{to}</span>
          <span className="w-full text-[12px] font-normal text-slate-500">
            {formatDuration(option.durationMin)} · <span className="group-open:hidden">voir les étapes</span>
            <span className="hidden group-open:inline">masquer les étapes</span>
          </span>
        </span>
        <IconChevron size={16} className="shrink-0 rotate-90 text-slate-500 transition-transform group-open:-rotate-90" />
      </summary>
      <ol className="grid gap-2 px-3 pb-3">
        {option.route.segments.map((seg, i) => (
          <li key={i} className="flex min-w-0 flex-col items-start gap-1 text-[13px]">
            <ModeChip mode={seg.mode} label={seg.label} />
            <span className="min-w-0 max-w-full break-words text-ink">
              {seg.from.name} → {seg.to.name}
              <span className="block text-[12px] text-slate-500">{formatDuration(seg.durationMinutes)}</span>
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Roadmap({ trip }: { trip: TripSummary }) {
  const home = trip.departure?.name ?? "Départ";
  const venue = trip.venue?.name ?? "Événement";
  return (
    <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
      <h3 className="text-[17px] font-bold text-ink">Ta feuille de route</h3>
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">{formatDay(trip.checkin)}</span>
      {trip.outbound && <RoadmapLeg option={trip.outbound} from={home} to={venue} />}
      {trip.withHotel && trip.hotel && (
        <div className="flex items-start gap-2 text-[13px]">
          <span className="rounded-md bg-walk px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">Hôtel</span>
          <span className="min-w-0 break-words text-ink">{trip.hotel.name}, à partir de 14:00</span>
        </div>
      )}
      {trip.roundTrip && trip.ret && (
        <>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">{formatDay(trip.returnDate)}</span>
          <RoadmapLeg option={trip.ret} from={venue} to={home} />
        </>
      )}
    </div>
  );
}

function Progress({ done, count }: { done: number; count: number }) {
  const all = count > 0 && done === count;
  return (
    <div className="grid gap-2 md:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] text-slate-500">
        <b className="text-[15px] text-ink">{all ? "Tout est réservé, bon concert !" : `${done} sur ${count} réservé${done > 1 ? "s" : ""}`}</b>
        <span>{all ? "Garde ta feuille de route pour le jour J." : "Commence par l'aller : les places partent le plus vite."}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-line">
        <div className="h-full rounded bg-ok transition-[width] duration-300" style={{ width: `${count ? Math.round((done / count) * 100) : 0}%` }} />
      </div>
    </div>
  );
}

export function BookView({ trip, booked, onToggleBooked, onGo, onOpenPanel, onShare }: BookViewProps) {
  const links = legLinks(trip);
  const legs: LegItem[] = [];
  if (trip.outbound) {
    legs.push({ key: "outbound", kind: "Aller", date: formatDay(trip.checkin), option: trip.outbound, links: links.outbound, includedInRoundTrip: false });
  }
  if (trip.roundTrip && trip.ret) {
    legs.push({
      key: "return",
      kind: "Retour",
      date: formatDay(trip.returnDate),
      option: trip.ret,
      links: links.ret,
      includedInRoundTrip: links.ret.length === 0 && links.roundTripModes.size > 0,
    });
  }
  const hasHotel = trip.withHotel && !!trip.hotel;
  const keys: BookingKey[] = [...legs.map((l) => l.key), ...(hasHotel ? (["hotel"] as BookingKey[]) : [])];
  const done = keys.filter((k) => booked[k]).length;
  const outboundLeg = legs.find((l) => l.key === "outbound");
  const returnLeg = legs.find((l) => l.key === "return");
  const subtitles = {
    home: `${trip.departure?.name ?? "Départ"} → ${trip.venue?.name ?? "Événement"}`,
    trip: hasHotel ? "Hôtel, aller et retour" : "Aller et retour",
    book: `${keys.length} réservation${keys.length > 1 ? "s" : ""}`,
  };

  const legCard = (l: LegItem | undefined, wide = false) =>
    l ? (
      <div className={wide ? "md:col-span-2" : ""}>
        <LegCard
          item={l}
          trip={trip}
          booked={!!booked[l.key]}
          onToggle={() => onToggleBooked(l.key)}
          onEdit={() => onOpenPanel(l.key)}
        />
      </div>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:pt-8">
      <div className="grid content-start gap-4">
        <div className="lg:hidden">
          <StepsInline current="book" onGo={onGo} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EventCard trip={trip} onEditDates={() => onOpenPanel("dates")} wide={!hasHotel} />
          {hasHotel && trip.hotel && (
            <div className="order-3 md:order-none">
              <HotelCard
                hotel={trip.hotel}
                trip={trip}
                booked={!!booked.hotel}
                onToggle={() => onToggleBooked("hotel")}
                onEdit={() => onOpenPanel("hotel")}
              />
            </div>
          )}
          <div className="order-2 md:order-none md:contents">{legCard(outboundLeg, !returnLeg)}</div>
          <div className="order-4 md:order-none md:contents">{legCard(returnLeg)}</div>
          <div className="order-5 md:order-none md:col-span-2">
            <Progress done={done} count={keys.length} />
          </div>
        </div>
        <details className="overflow-hidden rounded-2xl bg-white ring-1 ring-line lg:hidden">
          <summary className="px-4 py-3 text-[14px] font-semibold text-ink">Feuille de route et carte</summary>
          <div className="grid gap-3 border-t border-line p-3">
            <TripMap trip={trip} />
            <Roadmap trip={trip} />
          </div>
        </details>
      </div>

      <aside className="hidden lg:grid lg:content-start lg:gap-4">
        <StepsColumn current="book" onGo={onGo} subtitles={subtitles} />
        <TripMap trip={trip} />
        <Roadmap trip={trip} />
      </aside>

      <button
        type="button"
        onClick={onShare}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-nuit px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(22,21,58,0.35)] ring-1 ring-white/15 transition-transform hover:scale-[1.03] active:scale-95"
      >
        <IconShare size={18} /> Partager
      </button>
    </div>
  );
}
