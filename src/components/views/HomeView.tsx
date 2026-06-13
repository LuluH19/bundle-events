"use client";

import { Location, LatLng } from "@/src/types";
import { venues } from "@/src/utils/constants/venues";
import {
  Button,
  Chip,
  Eyebrow,
  IconArrow,
  IconPin,
  IconLeaf,
  IconClose,
} from "@/src/components/ui";

const EVENTS = [
  { venueId: "stade-de-france", title: "Rock en Seine", tag: "Festival", date: "28 AOÛT", from: 142, gradient: "from-[#0e3c60] to-[#00113a]" },
  { venueId: "accor-arena", title: "Nuit Électro", tag: "Concert", date: "12 SEPT", from: 79, gradient: "from-[#3a1d52] to-[#00113a]" },
  { venueId: "orange-velodrome", title: "Stade en Fête", tag: "Stade", date: "04 JUIL", from: 110, gradient: "from-[#0d5c63] to-[#00113a]" },
  { venueId: "groupama-stadium", title: "Nuits de Fourvière", tag: "Festival", date: "17 JUIL", from: 65, gradient: "from-[#9f4200] to-[#00113a]" },
];

interface HomeViewProps {
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
  onCompose: () => void;
  pickEvent: (id: string) => void;
}

export function HomeView(props: HomeViewProps) {
  const {
    departure,
    venue,
    depSearch,
    setDepSearch,
    depResults,
    depFocus,
    setDepFocus,
    onPickDeparture,
    onClearDeparture,
    onPickVenue,
    dateLabel,
    onCompose,
    pickEvent,
  } = props;
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
              <div className="mt-1.5 flex items-center rounded-xl bg-white px-3 py-2.5 text-[15px] font-medium text-ink ring-1 ring-line">
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
