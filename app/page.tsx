"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type {
  Location,
  TransportMode,
  RouteResult,
  LatLng,
  FlightInfo,
  HotelMapItem,
} from "@/lib/types";
import { computeRoute } from "@/lib/algorithms/routing";
import { venues } from "@/lib/data/venues";
import { searchLocation } from "@/lib/services/geocoding";
import { haversineDistance } from "@/lib/algorithms/geodesic";
import { airports } from "@/lib/data/airports";
import {
  Button,
  Chip,
  Eyebrow,
  MODE_ICON,
  IconArrow,
  IconPin,
  IconStar,
  IconLeaf,
  IconCheck,
  IconClose,
  IconMap,
} from "@/app/_components/ui";

const TravelMap = dynamic(() => import("@/app/_components/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-mist">
      <p className="text-sm text-slate-400">Chargement de la carte…</p>
    </div>
  ),
});

/* ───────────────────────── constants ───────────────────────── */

type Step = "home" | "routes" | "hotels" | "bundle";

const STEPS: { id: Step; n: string; label: string }[] = [
  { id: "home", n: "01", label: "Trajet" },
  { id: "routes", n: "02", label: "Itinéraires" },
  { id: "hotels", n: "03", label: "Hôtels" },
  { id: "bundle", n: "04", label: "Bundle" },
];

const MODE_META: Record<TransportMode, { label: string; provider: string; co2: "Bas" | "Moyen" | "Élevé" }> = {
  train: { label: "Train", provider: "SNCF", co2: "Bas" },
  plane: { label: "Avion", provider: "Air France", co2: "Élevé" },
  car: { label: "Voiture", provider: "Itinéraire routier", co2: "Élevé" },
  bus: { label: "Bus", provider: "Autocar longue distance", co2: "Bas" },
  walking: { label: "À pied", provider: "Marche", co2: "Bas" },
};

const RADIUS_OPTIONS = [5, 10, 20, 25, 50];

const EVENTS: {
  venueId: string;
  title: string;
  tag: string;
  date: string;
  eventDate: string;
  from: number;
  gradient: string;
}[] = [
  { venueId: "stade-de-france", title: "Rock en Seine", tag: "Festival", date: "28 AOÛT", eventDate: "2026-08-28", from: 142, gradient: "from-[#0e3c60] to-[#00113a]" },
  { venueId: "accor-arena", title: "Nuit Électro", tag: "Concert", date: "12 SEPT", eventDate: "2026-09-12", from: 79, gradient: "from-[#3a1d52] to-[#00113a]" },
  { venueId: "orange-velodrome", title: "Stade en Fête", tag: "Stade", date: "04 JUIL", eventDate: "2026-07-04", from: 110, gradient: "from-[#0d5c63] to-[#00113a]" },
  { venueId: "groupama-stadium", title: "Nuits de Fourvière", tag: "Festival", date: "17 JUIL", eventDate: "2026-07-17", from: 65, gradient: "from-[#9f4200] to-[#00113a]" },
];

/* ───────────────────────── helpers ───────────────────────── */

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}
function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
function priceEstimate(mode: TransportMode, km: number) {
  switch (mode) {
    case "walking": return 0;
    case "bus": return Math.round(km * 0.06 + 5);
    case "car": return Math.round(km * 0.13 + 6);
    case "train": return Math.round(km * 0.16 + 15);
    case "plane": return Math.round(km * 0.1 + 55);
  }
}
function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function todayIso() {
  return toIsoDate(new Date());
}
function stayDatesFromEvent(eventDate: string) {
  const event = new Date(`${eventDate}T12:00:00`);
  const checkin = new Date(event);
  checkin.setDate(checkin.getDate() - 1);
  const checkout = new Date(event);
  checkout.setDate(checkout.getDate() + 1);
  return { checkin: toIsoDate(checkin), checkout: toIsoDate(checkout) };
}
function formatStayLabel(checkin: string, checkout: string) {
  const d1 = new Date(`${checkin}T12:00:00`);
  const d2 = new Date(`${checkout}T12:00:00`);
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
    const month = d2.toLocaleDateString("fr-FR", { month: "long" });
    return `${d1.getDate()} — ${d2.getDate()} ${month}`;
  }
  const f1 = d1.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const f2 = d2.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${f1} — ${f2}`;
}
function stayNights(checkin: string, checkout: string) {
  return Math.max(1, Math.round((new Date(`${checkout}T12:00:00`).getTime() - new Date(`${checkin}T12:00:00`).getTime()) / 86400000));
}
function isValidStay(checkin: string, checkout: string) {
  if (!checkin || !checkout) return false;
  const inDate = new Date(`${checkin}T12:00:00`);
  const outDate = new Date(`${checkout}T12:00:00`);
  const today = new Date(`${todayIso()}T12:00:00`);
  return outDate > inDate && inDate >= today;
}

interface RouteOption {
  mode: TransportMode;
  route: RouteResult;
  durationMin: number;
  distanceKm: number;
  price: number;
}

async function computeOptions(
  from: { name: string; coords: LatLng },
  to: { name: string; coords: LatLng }
): Promise<RouteOption[]> {
  const dist = haversineDistance(from.coords, to.coords);
  const modes: TransportMode[] = [];
  if (dist < 8) modes.push("walking");
  modes.push("car", "bus");
  if (dist > 20) modes.push("train");
  if (dist > 200) modes.push("plane");

  const results = await Promise.all(
    modes.map(async (mode) => {
      try {
        const route = await computeRoute(from, to, [mode]);
        return {
          mode,
          route,
          durationMin: route.totalDurationMinutes,
          distanceKm: route.totalDistanceKm,
          price: priceEstimate(mode, route.totalDistanceKm),
        } as RouteOption;
      } catch {
        return null;
      }
    })
  );
  return (results.filter(Boolean) as RouteOption[]).sort((a, b) => a.durationMin - b.durationMin);
}

/* train + flight detail enrichment (kept from the functional app) */
function findNearest<T extends { coords: LatLng; id: string }>(point: LatLng, items: T[]): T {
  return items.reduce((best, item) =>
    haversineDistance(point, item.coords) < haversineDistance(point, best.coords) ? item : best
  );
}
async function fetchFlightInfo(from: LatLng, to: LatLng): Promise<FlightInfo[]> {
  const dep = findNearest(from, airports);
  const arr = findNearest(to, airports);
  if (dep.id === arr.id) return [];
  try {
    const res = await fetch(`/api/flights/search?origin=${dep.iataCode}&destination=${arr.iataCode}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.flights || [];
  } catch {
    return [];
  }
}
interface TrainJourney {
  departureAt: string;
  arrivalAt: string;
  transfers: number;
  trains: { name: string; number: string; departureStation: string; arrivalStation: string; departureTime: string; arrivalTime: string }[];
}
async function fetchTrainInfo(from: LatLng, to: LatLng): Promise<TrainJourney[]> {
  try {
    const [d, a] = await Promise.all([
      fetch(`/api/stations?lat=${from.lat}&lng=${from.lng}&radius=50`),
      fetch(`/api/stations?lat=${to.lat}&lng=${to.lng}&radius=50`),
    ]);
    if (!d.ok || !a.ok) return [];
    const ds = (await d.json()).stations || [];
    const as = (await a.json()).stations || [];
    if (!ds.length || !as.length) return [];
    const dep = ds[0];
    let arr = as[0];
    if (dep.id === arr.id && as.length > 1) arr = as[1];
    if (dep.id === arr.id) return [];
    const res = await fetch(`/api/trains/search?from=${dep.sncfId}&to=${arr.sncfId}`);
    if (!res.ok) return [];
    return (await res.json()).journeys || [];
  } catch {
    return [];
  }
}
function timeOf(s: string) {
  return new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/* ───────────────────────── chrome ───────────────────────── */

function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[22px] font-extrabold tracking-tight text-ink ${className}`}>
      bundle<span className="text-ember">.</span>
    </span>
  );
}

function TopBar({ step, go, canReach }: { step: Step; go: (s: Step) => void; canReach: (s: Step) => boolean }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-white/90 px-5 py-3 backdrop-blur-xl md:px-8">
      <button onClick={() => go("home")} className="shrink-0">
        <Brand />
      </button>
      <nav className="mx-auto hidden items-center gap-1 md:flex">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const reachable = canReach(s.id);
          return (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => reachable && go(s.id)}
                disabled={!reachable}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-colors ${
                  active ? "bg-ink text-white" : reachable ? "text-slate-500 hover:bg-mist" : "text-slate-300"
                }`}
              >
                <span className="font-mono text-[10px] tracking-widest">{s.n}</span>
                <span className="text-[13px] font-medium">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-3 bg-line" />}
            </div>
          );
        })}
      </nav>
      <div className="ml-auto hidden items-center gap-3 md:flex">
        <span className="text-[11px] font-medium tracking-widest text-slate-400">FR · €</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-white">
          BE
        </span>
      </div>
    </header>
  );
}

function MobileTabBar({ step, go, canReach }: { step: Step; go: (s: Step) => void; canReach: (s: Step) => boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white/95 backdrop-blur-xl md:hidden">
      {STEPS.map((s) => {
        const active = s.id === step;
        const reachable = canReach(s.id);
        return (
          <button
            key={s.id}
            onClick={() => reachable && go(s.id)}
            disabled={!reachable}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-ember-ink" : reachable ? "text-slate-500" : "text-slate-300"
            }`}
          >
            <span className={`font-mono text-[10px] ${active ? "text-ember" : ""}`}>{s.n}</span>
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function Home() {
  const [step, setStep] = useState<Step>("home");

  const [departure, setDeparture] = useState<Location | null>(null);
  const [venue, setVenue] = useState<Location | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [hotelDatesReady, setHotelDatesReady] = useState(false);

  const dateLabel = useMemo(
    () => (checkin && checkout ? formatStayLabel(checkin, checkout) : "Dates à confirmer"),
    [checkin, checkout]
  );
  const selectedEvent = useMemo(
    () => EVENTS.find((e) => e.venueId === selectedEventId) ?? null,
    [selectedEventId]
  );

  // departure search
  const [depSearch, setDepSearch] = useState("");
  const [depResults, setDepResults] = useState<{ displayName: string; address: string; coords: LatLng }[]>([]);
  const [depFocus, setDepFocus] = useState(false);

  // transport options
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TransportMode | null>(null);
  const [trainJourneys, setTrainJourneys] = useState<TrainJourney[]>([]);
  const [flights, setFlights] = useState<FlightInfo[]>([]);

  // hotels
  const [hotelRadius, setHotelRadius] = useState(10);
  const [hotelResults, setHotelResults] = useState<HotelMapItem[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState("");
  const [selectedHotel, setSelectedHotel] = useState<HotelMapItem | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const applyEventDates = useCallback((eventDate: string) => {
    const { checkin: inDate, checkout: outDate } = stayDatesFromEvent(eventDate);
    setCheckin(inDate);
    setCheckout(outDate);
    setHotelDatesReady(false);
    setSelectedHotel(null);
    setHotelResults([]);
  }, []);

  const selectedOption = useMemo(() => options.find((o) => o.mode === selectedMode) || null, [options, selectedMode]);
  const hotelLocation: Location | null = useMemo(
    () => (selectedHotel ? { id: selectedHotel.id, name: selectedHotel.name, coords: selectedHotel.coords, type: "hotel", address: selectedHotel.locationName } : null),
    [selectedHotel]
  );

  const canReach = useCallback(
    (s: Step) => {
      if (s === "home") return true;
      if (s === "routes") return !!(departure && venue);
      if (s === "hotels") return !!venue;
      if (s === "bundle") return !!(departure && venue && selectedOption);
      return false;
    },
    [departure, venue, selectedOption]
  );

  // departure autocomplete
  useEffect(() => {
    if (depSearch.length < 3) {
      setDepResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchLocation(depSearch);
        setDepResults(r.map((x) => ({ displayName: x.displayName, address: x.address, coords: x.coords })));
      } catch {
        setDepResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [depSearch]);

  // compute transport options when both ends known
  useEffect(() => {
    if (!departure || !venue) {
      setOptions([]);
      setSelectedMode(null);
      return;
    }
    let cancelled = false;
    setOptionsLoading(true);
    setOptions([]);
    setSelectedMode(null);
    computeOptions(
      { name: departure.name, coords: departure.coords },
      { name: venue.name, coords: venue.coords }
    )
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts);
        setSelectedMode(opts[0]?.mode ?? null);
      })
      .finally(() => !cancelled && setOptionsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [departure, venue]);

  // enrich selected option with live train / flight detail
  useEffect(() => {
    setTrainJourneys([]);
    setFlights([]);
    if (!departure || !venue || !selectedOption) return;
    let cancelled = false;
    if (selectedOption.mode === "train") {
      fetchTrainInfo(departure.coords, venue.coords).then((j) => !cancelled && setTrainJourneys(j));
    } else if (selectedOption.mode === "plane") {
      fetchFlightInfo(departure.coords, venue.coords).then((f) => !cancelled && setFlights(f));
    }
    return () => {
      cancelled = true;
    };
  }, [selectedOption, departure, venue]);

  // live hotel search around the venue (only after dates confirmed)
  useEffect(() => {
    if (!venue || !hotelDatesReady || !isValidStay(checkin, checkout)) {
      if (!hotelDatesReady) {
        setHotelResults([]);
        setHotelLoading(false);
      }
      return;
    }
    let cancelled = false;
    setHotelLoading(true);
    setHotelError("");
    const params = new URLSearchParams({
      lat: String(venue.coords.lat),
      lng: String(venue.coords.lng),
      radius: String(hotelRadius),
      checkin,
      checkout,
    });
    const t = setTimeout(() => {
      fetch(`/api/hotels/search?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
        .then((data: HotelMapItem[]) => {
          if (cancelled) return;
          setHotelResults(Array.isArray(data) ? data : []);
          if (!Array.isArray(data) || data.length === 0) setHotelError("Aucun hôtel trouvé dans ce rayon.");
        })
        .catch(() => {
          if (!cancelled) {
            setHotelResults([]);
            setHotelError("La recherche d'hôtels a échoué. Réessayez.");
          }
        })
        .finally(() => !cancelled && setHotelLoading(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [venue, hotelRadius, checkin, checkout, hotelDatesReady]);

  const go = useCallback((s: Step) => setStep(s), []);

  const pickEvent = (venueId: string) => {
    const v = venues.find((x) => x.id === venueId);
    const event = EVENTS.find((x) => x.venueId === venueId);
    if (!v || !event) return;
    setSelectedEventId(venueId);
    setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
    applyEventDates(event.eventDate);
    document.getElementById("search-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleCheckinChange = (value: string) => {
    setCheckin(value);
    setHotelDatesReady(false);
    setSelectedHotel(null);
    setHotelResults([]);
  };

  const handleCheckoutChange = (value: string) => {
    setCheckout(value);
    setHotelDatesReady(false);
    setSelectedHotel(null);
    setHotelResults([]);
  };

  const confirmHotelDates = () => {
    if (!isValidStay(checkin, checkout)) return;
    setHotelDatesReady(true);
    setSelectedHotel(null);
  };

  const journeyRoute = selectedOption?.route ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar step={step} go={go} canReach={canReach} />

      <main className="flex-1 pb-16 md:pb-0">
        {step === "home" && (
          <HomeView
            departure={departure}
            venue={venue}
            depSearch={depSearch}
            setDepSearch={setDepSearch}
            depResults={depResults}
            depFocus={depFocus}
            setDepFocus={setDepFocus}
            onPickDeparture={(r) => {
              setDeparture({ id: `dep-${Date.now()}`, name: r.displayName.split(",")[0], coords: r.coords, type: "departure", address: r.address });
              setDepSearch(r.displayName);
              setDepResults([]);
            }}
            onClearDeparture={() => {
              setDeparture(null);
              setDepSearch("");
            }}
            onPickVenue={(id) => {
              const v = venues.find((x) => x.id === id);
              if (v) {
                setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
                const event = EVENTS.find((e) => e.venueId === id);
                if (event) {
                  setSelectedEventId(id);
                  applyEventDates(event.eventDate);
                } else {
                  setSelectedEventId(null);
                  setCheckin("");
                  setCheckout("");
                  setHotelDatesReady(false);
                  setSelectedHotel(null);
                  setHotelResults([]);
                }
              }
            }}
            dateLabel={dateLabel}
            hasStayDates={!!(checkin && checkout)}
            onCompose={() => go(departure && venue ? "routes" : "home")}
            pickEvent={pickEvent}
          />
        )}

        {step === "routes" && (
          <RoutesView
            departure={departure}
            venue={venue}
            dateLabel={dateLabel}
            options={options}
            loading={optionsLoading}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            trainJourneys={trainJourneys}
            flights={flights}
            journeyRoute={journeyRoute}
            onContinue={() => go("hotels")}
          />
        )}

        {step === "hotels" && (
          <HotelsView
            venue={venue}
            selectedEvent={selectedEvent}
            checkin={checkin}
            checkout={checkout}
            onCheckinChange={handleCheckinChange}
            onCheckoutChange={handleCheckoutChange}
            hotelDatesReady={hotelDatesReady}
            onConfirmDates={confirmHotelDates}
            stayLabel={checkin && checkout ? formatStayLabel(checkin, checkout) : ""}
            nights={checkin && checkout ? stayNights(checkin, checkout) : 0}
            hotelRadius={hotelRadius}
            setHotelRadius={setHotelRadius}
            hotelResults={hotelResults}
            hotelLoading={hotelLoading}
            hotelError={hotelError}
            selectedHotel={selectedHotel}
            onSelectHotel={setSelectedHotel}
            departure={departure}
            hotelLocation={hotelLocation}
            journeyRoute={journeyRoute}
            mobileMapOpen={mobileMapOpen}
            setMobileMapOpen={setMobileMapOpen}
            onContinue={() => go("bundle")}
          />
        )}

        {step === "bundle" && (
          <BundleView
            departure={departure}
            venue={venue}
            dateLabel={dateLabel}
            selectedOption={selectedOption}
            selectedHotel={selectedHotel}
            checkin={checkin}
            checkout={checkout}
            onEdit={go}
          />
        )}
      </main>

      <MobileTabBar step={step} go={go} canReach={canReach} />
    </div>
  );
}

/* ───────────────────────── HOME ───────────────────────── */

function HomeView(props: {
  departure: Location | null;
  venue: Location | null;
  depSearch: string;
  setDepSearch: (v: string) => void;
  depResults: { displayName: string; address: string; coords: LatLng }[];
  depFocus: boolean;
  setDepFocus: (v: boolean) => void;
  onPickDeparture: (r: { displayName: string; address: string; coords: LatLng }) => void;
  onClearDeparture: () => void;
  onPickVenue: (id: string) => void;
  dateLabel: string;
  hasStayDates: boolean;
  onCompose: () => void;
  pickEvent: (id: string) => void;
}) {
  const { departure, venue, depSearch, setDepSearch, depResults, depFocus, setDepFocus, onPickDeparture, onClearDeparture, onPickVenue, dateLabel, hasStayDates, onCompose, pickEvent } = props;
  const ready = !!(departure && venue);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy px-5 pb-28 pt-16 md:px-8 md:pb-40 md:pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_-10%,rgba(249,108,26,0.25),transparent),linear-gradient(180deg,rgba(0,17,58,0.2),rgba(0,17,58,0.65))]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <Eyebrow tone="ember" className="mb-5 text-ember-soft">
            Événements · Transport · Hébergement
          </Eyebrow>
          <h1 className="font-display text-[44px] font-extrabold leading-[0.96] tracking-[-0.02em] text-white md:text-[72px]">
            Votre parcours
            <br />
            événementiel,{" "}
            <span className="text-ember-soft">en un bundle.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-[18px]">
            Dis-nous où tu vas et d&apos;où tu pars. On compare les transports, on trouve l&apos;hôtel à côté
            de la scène, on assemble tout — tu réserves en un clic.
          </p>
        </div>

        {/* Search card */}
        <div
          id="search-card"
          className="glass relative mx-auto mt-10 max-w-3xl rounded-3xl border border-white/40 p-5 shadow-[0_24px_60px_-20px_rgba(0,11,58,0.5)] md:mt-12 md:p-7"
        >
          <div className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.9fr]">
            {/* Departure */}
            <div className="relative">
              <label className="eyebrow flex items-center gap-1.5 text-slate-500">
                <IconPin size={12} className="text-ember" /> De
              </label>
              {departure ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-line">
                  <span className="truncate text-[15px] font-medium text-ink">{departure.name}</span>
                  <button onClick={onClearDeparture} className="text-slate-400 hover:text-ember">
                    <IconClose size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={depSearch}
                    onChange={(e) => setDepSearch(e.target.value)}
                    onFocus={() => setDepFocus(true)}
                    onBlur={() => setTimeout(() => setDepFocus(false), 150)}
                    placeholder="Ville, gare, aéroport…"
                    className="mt-1.5 w-full rounded-xl bg-white px-3 py-2.5 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-slate-400 focus:ring-2 focus:ring-ember"
                  />
                  {depFocus && depResults.length > 0 && (
                    <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-line">
                      {depResults.map((r, i) => (
                        <li key={i}>
                          <button
                            onMouseDown={() => onPickDeparture(r)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] hover:bg-mist"
                          >
                            <IconPin size={14} className="shrink-0 text-ember" />
                            <span className="truncate">{r.displayName}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* Venue */}
            <div>
              <label className="eyebrow flex items-center gap-1.5 text-slate-500">
                <IconPin size={12} className="text-ember" /> Vers
              </label>
              <select
                value={venue?.id || ""}
                onChange={(e) => onPickVenue(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-white px-3 py-2.5 text-[15px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-ember"
              >
                <option value="">Votre événement…</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="eyebrow text-slate-500">Dates</label>
              <div className={`mt-1.5 flex items-center rounded-xl bg-white px-3 py-2.5 text-[15px] font-medium ring-1 ring-line ${hasStayDates ? "text-ink" : "text-slate-400"}`}>
                {dateLabel}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[13px] text-slate-500">
              <IconLeaf size={14} className="text-[#0d5c63]" /> Empreinte carbone affichée pour chaque trajet.
            </p>
            <Button onClick={onCompose} disabled={!ready} className="sm:w-auto">
              Créer mon bundle <IconArrow size={16} />
            </Button>
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <Eyebrow className="mb-2">Les événements à venir</Eyebrow>
            <h2 className="font-display text-[28px] font-extrabold tracking-tight text-ink md:text-[40px]">
              À ne pas manquer.
            </h2>
          </div>
          <span className="hidden items-center gap-1.5 text-[13px] font-medium text-slate-500 sm:flex">
            Tous les événements <IconArrow size={14} />
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EVENTS.map((e) => {
            const v = venues.find((x) => x.id === e.venueId);
            return (
              <button
                key={e.venueId}
                onClick={() => pickEvent(e.venueId)}
                className={`group flex min-h-[210px] flex-col justify-between rounded-2xl bg-gradient-to-br ${e.gradient} p-5 text-left text-white transition-transform hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-widest text-white/80">{e.date}</span>
                  <Chip className="bg-white/15 text-white">{e.tag}</Chip>
                </div>
                <div>
                  <div className="font-display text-[26px] font-bold leading-tight">{e.title}</div>
                  <div className="mt-1 text-[13px] text-white/70">{v?.city}</div>
                  <div className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-white/90">
                    Composer <IconArrow size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-[11px] tracking-widest text-slate-400 sm:flex-row">
          <span>© 2026 BUNDLE EVENTS</span>
          <span>FAQ · CONTACT · CGV</span>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────── ROUTES ───────────────────────── */

function RoutesView(props: {
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
}) {
  const { departure, venue, dateLabel, options, loading, selectedMode, onSelectMode, trainJourneys, flights, journeyRoute, onContinue } = props;
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
          {options.length || loading ? <>Plusieurs façons d&apos;<span className="text-ember">y aller.</span></> : "Choisissez votre trajet."}
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
            Continuer vers les hôtels <IconArrow size={16} />
          </Button>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── HOTELS ───────────────────────── */

function HotelDistance(h: HotelMapItem, venue: Location | null) {
  if (!venue) return null;
  return haversineDistance(h.coords, venue.coords);
}

function HotelsView(props: {
  venue: Location | null;
  selectedEvent: (typeof EVENTS)[number] | null;
  checkin: string;
  checkout: string;
  onCheckinChange: (v: string) => void;
  onCheckoutChange: (v: string) => void;
  hotelDatesReady: boolean;
  onConfirmDates: () => void;
  stayLabel: string;
  nights: number;
  hotelRadius: number;
  setHotelRadius: (n: number) => void;
  hotelResults: HotelMapItem[];
  hotelLoading: boolean;
  hotelError: string;
  selectedHotel: HotelMapItem | null;
  onSelectHotel: (h: HotelMapItem | null) => void;
  departure: Location | null;
  hotelLocation: Location | null;
  journeyRoute: RouteResult | null;
  mobileMapOpen: boolean;
  setMobileMapOpen: (v: boolean) => void;
  onContinue: () => void;
}) {
  const {
    venue, selectedEvent, checkin, checkout, onCheckinChange, onCheckoutChange,
    hotelDatesReady, onConfirmDates, stayLabel, nights,
    hotelRadius, setHotelRadius, hotelResults, hotelLoading, hotelError,
    selectedHotel, onSelectHotel, departure, hotelLocation, journeyRoute, mobileMapOpen, setMobileMapOpen, onContinue,
  } = props;

  const datesValid = isValidStay(checkin, checkout);

  const sorted = useMemo(() => {
    return [...hotelResults].sort((a, b) => {
      const da = HotelDistance(a, venue) ?? 0;
      const db = HotelDistance(b, venue) ?? 0;
      return da - db;
    });
  }, [hotelResults, venue]);

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
      route={journeyRoute}
      hotelResults={hotelResults}
      selectedHotelId={selectedHotel?.id ?? null}
      onHotelSelect={onSelectHotel}
      hotelRadius={hotelRadius}
      showHotels={hotelDatesReady}
    />
  );

  return (
    <div className="flex flex-col md:h-[calc(100dvh-65px)] md:flex-row">
      {/* List */}
      <aside className="scroll-slim w-full overflow-y-auto bg-page p-5 md:w-[560px] md:p-7">
        <Eyebrow className="mb-2">Hébergements disponibles</Eyebrow>
        <h2 className="font-display text-[30px] font-extrabold tracking-tight text-ink md:text-[40px]">
          Votre base près de <span className="text-ember">{venue.name}</span>.
        </h2>
        <p className="mt-2 text-[14px] text-slate-500">{venue.address || venue.name}</p>

        {/* Stay dates */}
        <div className="mt-5 rounded-2xl border border-line bg-white p-4">
          <Eyebrow className="mb-2">Dates de séjour</Eyebrow>
          <p className="text-[13px] text-slate-500">
            {selectedEvent
              ? `Séjour suggéré autour de ${selectedEvent.title} · ${selectedEvent.date}. Ajustez si besoin.`
              : "Choisissez vos dates pour afficher les tarifs réels."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow text-slate-500">Arrivée</label>
              <input
                type="date"
                value={checkin}
                min={todayIso()}
                onChange={(e) => onCheckinChange(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-white px-3 py-2.5 text-[14px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-ember"
              />
            </div>
            <div>
              <label className="eyebrow text-slate-500">Départ</label>
              <input
                type="date"
                value={checkout}
                min={checkin || todayIso()}
                onChange={(e) => onCheckoutChange(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-white px-3 py-2.5 text-[14px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-ember"
              />
            </div>
          </div>
          {checkin && checkout && !datesValid && (
            <p className="mt-2 text-[12px] text-ember-ink">Vérifiez vos dates (départ après arrivée, séjour à venir).</p>
          )}
          {datesValid && (
            <p className="mt-2 text-[12px] text-slate-400">
              {nights} nuit{nights > 1 ? "s" : ""} · {stayLabel}
            </p>
          )}
          <Button onClick={onConfirmDates} disabled={!datesValid} className="mt-4 w-full">
            {hotelDatesReady ? "Mettre à jour les tarifs" : "Afficher les tarifs"} <IconArrow size={16} />
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 ring-1 ring-line">
            <span className="text-[12px] font-medium text-slate-500">Rayon</span>
            <select
              value={hotelRadius}
              onChange={(e) => setHotelRadius(Number(e.target.value))}
              disabled={!hotelDatesReady}
              className="bg-transparent text-[13px] font-semibold text-ink outline-none disabled:text-slate-400"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>
          </div>
          {hotelDatesReady && (
            <span className="rounded-full bg-mist px-3 py-1.5 text-[12px] font-medium text-slate-600">
              Tarifs · {stayLabel}
            </span>
          )}
          <span className="text-[13px] text-slate-400">
            {!hotelDatesReady
              ? "Confirmez vos dates"
              : hotelLoading
                ? "Recherche…"
                : `${hotelResults.length} hôtel${hotelResults.length > 1 ? "s" : ""}`}
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
          {!hotelDatesReady && (
            <p className="rounded-2xl bg-mist p-4 text-[14px] text-slate-500">
              Les tarifs LiteAPI s&apos;affichent une fois vos dates de séjour confirmées.
            </p>
          )}

          {hotelDatesReady && hotelLoading &&
            [0, 1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-mist" />)}

          {hotelDatesReady && !hotelLoading && hotelError && (
            <p className="rounded-2xl bg-ember-soft/60 p-4 text-[14px] text-ember-ink">{hotelError}</p>
          )}

          {hotelDatesReady &&
            !hotelLoading &&
            sorted.map((h) => {
              const selected = selectedHotel?.id === h.id;
              const dist = HotelDistance(h, venue);
              return (
                <div
                  key={h.id}
                  className={`flex gap-4 rounded-2xl border bg-white p-3 transition-all ${selected ? "border-ember ring-1 ring-ember" : "border-line hover:border-ember/40"}`}
                >
                  <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-navy to-ink">
                    {h.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.photo} alt={h.name} className="h-full w-full object-cover" loading="lazy" />
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
                        {h.locationName && <p className="mt-0.5 truncate text-[12px] text-slate-400">{h.locationName}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        {h.pricePerNight ? (
                          <>
                            <div className="font-display text-[20px] font-bold text-ink">
                              {h.currency === "EUR" || !h.currency ? "€" : h.currency}
                              {h.pricePerNight}
                            </div>
                            <div className="font-mono text-[10px] tracking-widest text-slate-400">/ NUIT · {stayLabel}</div>
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
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                          selected ? "bg-ember text-white" : "bg-ink text-white hover:bg-navy-700"
                        }`}
                      >
                        {selected ? <><IconCheck size={14} /> Choisi</> : "Sélectionner"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          {hotelDatesReady && !hotelLoading && !hotelError && sorted.length === 0 && (
            <p className="rounded-2xl bg-mist p-4 text-[14px] text-slate-500">Aucun hôtel dans ce rayon.</p>
          )}
        </div>

        <div className="sticky bottom-0 mt-6 bg-page pt-2 pb-1">
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

/* ───────────────────────── BUNDLE ───────────────────────── */

function BundleView(props: {
  departure: Location | null;
  venue: Location | null;
  dateLabel: string;
  selectedOption: RouteOption | null;
  selectedHotel: HotelMapItem | null;
  checkin: string;
  checkout: string;
  onEdit: (s: Step) => void;
}) {
  const { departure, venue, dateLabel, selectedOption, selectedHotel, checkin, checkout, onEdit } = props;

  const nights = stayNights(checkin, checkout);
  const transportCost = selectedOption ? selectedOption.price : 0;
  const hotelCost = selectedHotel?.pricePerNight ? selectedHotel.pricePerNight * nights : 0;
  const total = transportCost + hotelCost;
  const stayLabel = formatStayLabel(checkin, checkout);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
      <Eyebrow className="mb-2">Bundle Summary</Eyebrow>
      <h1 className="font-display text-[36px] font-extrabold leading-tight tracking-[-0.02em] text-ink md:text-[56px]">
        Votre escapade,
        <br />
        <span className="text-ember">assemblée.</span>
      </h1>
      <p className="mt-3 text-[15px] text-slate-500">
        {venue?.name} · {dateLabel} · {nights} nuit{nights > 1 ? "s" : ""}
      </p>

      {/* Total card */}
      <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-ink p-7 text-white shadow-[0_24px_60px_-24px_rgba(0,17,58,0.6)]">
        <Eyebrow className="text-ember-soft">Total estimé</Eyebrow>
        <div className="mt-1 font-display text-[44px] font-extrabold md:text-[56px]">
          €{total.toLocaleString("fr-FR")}
        </div>
        <p className="text-[13px] text-white/50">Taxes et frais locaux estimés inclus</p>
      </div>

      {/* Line items */}
      <div className="mt-6 flex flex-col gap-4">
        <BundleRow
          eyebrow="Transport"
          title={selectedOption ? MODE_META[selectedOption.mode].label : "—"}
          subtitle={selectedOption ? `${departure?.name} → ${venue?.name} · ${formatDuration(selectedOption.durationMin)}` : "Aucun trajet sélectionné"}
          price={transportCost ? `€${transportCost}` : "—"}
          onEdit={() => onEdit("routes")}
          icon={selectedOption ? MODE_ICON[selectedOption.mode]({ size: 22 }) : null}
        />
        <BundleRow
          eyebrow="Hébergement"
          title={selectedHotel?.name || "—"}
          subtitle={selectedHotel ? `${stayLabel} · ${nights} nuit${nights > 1 ? "s" : ""}${selectedHotel.pricePerNight ? ` · €${selectedHotel.pricePerNight}/nuit` : ""}` : "Aucun hôtel sélectionné"}
          price={hotelCost ? `€${hotelCost.toLocaleString("fr-FR")}` : "—"}
          onEdit={() => onEdit("hotels")}
          icon={<IconPin size={22} />}
          photo={selectedHotel?.photo}
        />
        <BundleRow
          eyebrow="Événement"
          title={venue?.name || "—"}
          subtitle={venue?.address || ""}
          price="Inclus"
          onEdit={() => onEdit("home")}
          icon={<IconStar size={20} />}
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button kind="primary" className="flex-1">Réserver mon bundle <IconArrow size={16} /></Button>
        <Button kind="ghost" onClick={() => onEdit("home")} className="sm:w-auto">Modifier</Button>
      </div>
      <p className="mt-3 text-center text-[12px] text-slate-400">
        Tarif garanti pendant 24 h · Bundle ID provisoire BE-{(total * 7 + 100000).toString().slice(0, 6)}-FR
      </p>
    </div>
  );
}

function BundleRow({
  eyebrow, title, subtitle, price, onEdit, icon, photo,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  price: string;
  onEdit: () => void;
  icon: React.ReactNode;
  photo?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist text-ink">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={title} className="h-full w-full object-cover" />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="eyebrow text-slate-400">{eyebrow}</div>
        <div className="truncate font-display text-[17px] font-bold text-ink">{title}</div>
        <div className="truncate text-[13px] text-slate-500">{subtitle}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-[18px] font-bold text-ink">{price}</div>
        <button onClick={onEdit} className="text-[12px] font-medium text-ember-ink hover:underline">
          Modifier
        </button>
      </div>
    </div>
  );
}
