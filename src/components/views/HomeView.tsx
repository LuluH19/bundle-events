"use client";

import { useMemo } from "react";
import { Location, LatLng } from "@/src/types";
import { isoPlusDays } from "@/src/utils/date";
import {
  IconPin,
  IconLeaf,
  IconClose,
  IconSearch,
  IconSparkle,
  IconTicket,
} from "@/src/components/ui";

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
  onClearVenue: () => void;
  venueSearch: string;
  setVenueSearch: (v: string) => void;
  venueResults: { id: string; name: string; city: string }[];
  venueFocus: boolean;
  setVenueFocus: (v: boolean) => void;
  roundTrip: boolean;
  setRoundTrip: (v: boolean) => void;
  dateLabel: string;
  checkin: string;
  checkout: string;
  setCheckin: (v: string) => void;
  setCheckout: (v: string) => void;
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
    onClearVenue,
    venueSearch,
    setVenueSearch,
    venueResults,
    venueFocus,
    setVenueFocus,
    roundTrip,
    setRoundTrip,
    checkin,
    checkout,
    setCheckin,
    setCheckout,
    onCompose,
  } = props;
  const ready = !!(departure && venue);

  const today = useMemo(() => isoPlusDays(0), []);

  return (
    <div>
      <section className="relative overflow-hidden bg-navy px-5 pb-28 pt-20 md:px-8 md:pb-40 md:pt-32">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-concert.jpg')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,11,58,0.5),rgba(0,11,58,0.82))]" />
        <div className="relative mx-auto max-w-4xl text-center">
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

        <div
          id="search-card"
          className="relative mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-xl bg-white/85 p-4 shadow-[0_24px_48px_-12px_rgba(0,11,58,0.45)] backdrop-blur-2xl md:mt-12 md:p-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center">
          <div className="relative w-full flex-1 px-4 py-2 text-left md:px-6">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">De</label>
            {departure ? (
              <div className="flex items-center gap-2.5">
                <img src="/cible.svg" alt="" width={20} height={20} className="shrink-0" />
                <span className="flex-1 truncate text-[16px] font-medium text-ink">{departure.name}</span>
                <button onClick={onClearDeparture} className="text-slate-400 hover:text-ember">
                  <IconClose size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <img src="/cible.svg" alt="" width={20} height={20} className="shrink-0" />
                  <input
                    value={depSearch}
                    onChange={(e) => setDepSearch(e.target.value)}
                    onFocus={() => setDepFocus(true)}
                    onBlur={() => setTimeout(() => setDepFocus(false), 150)}
                    placeholder="Ville actuelle"
                    className="w-full bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-slate-400"
                  />
                </div>
                {depFocus && depResults.length > 0 && (
                  <ul className="absolute left-3 right-3 z-20 mt-3 max-h-56 overflow-auto rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-line md:left-5 md:right-5">
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

          <div className="relative w-full flex-1 px-4 py-2 text-left md:px-6">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Vers</label>
            {venue ? (
              <div className="flex items-center gap-2.5">
                <img src="/carte.svg" alt="" width={20} height={20} className="shrink-0" />
                <span className="flex-1 truncate text-[16px] font-medium text-ink">{venue.name}</span>
                <button
                  onClick={onClearVenue}
                  className="text-slate-400 hover:text-ember"
                >
                  <IconClose size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <img src="/carte.svg" alt="" width={20} height={20} className="shrink-0" />
                  <input
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                    onFocus={() => setVenueFocus(true)}
                    onBlur={() => setTimeout(() => setVenueFocus(false), 150)}
                    placeholder="Votre événement"
                    className="w-full bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-slate-400"
                  />
                </div>
                {venueFocus && venueResults.length > 0 && (
                  <ul className="absolute left-3 right-3 z-20 mt-3 max-h-56 overflow-auto rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-line md:left-5 md:right-5">
                    {venueResults.map((v) => (
                      <li key={v.id}>
                        <button
                          onMouseDown={() => onPickVenue(v.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] hover:bg-mist"
                        >
                          <IconPin size={14} className="shrink-0 text-ember" />
                          <span className="truncate">
                            {v.name} — {v.city}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          </div>

          <div role="radiogroup" className="flex items-center gap-2 px-4 md:px-6">
            {[
              { value: true, label: "Aller-retour" },
              { value: false, label: "Aller simple" },
            ].map((opt) => {
              const active = roundTrip === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRoundTrip(opt.value)}
                  className={`flex-1 rounded-[4px] px-5 py-2.5 text-[13px] font-bold transition-colors ${
                    active
                      ? "bg-navy-700 text-white shadow-lg shadow-navy-700/25"
                      : "bg-white text-slate-600 ring-1 ring-inset ring-line hover:bg-mist"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 md:flex-row md:items-center">
          <div className="w-full flex-1 px-4 py-2 text-left md:px-6">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Date aller</label>
            <div className="flex items-center gap-2.5 whitespace-nowrap">
              <img src="/calendrier.svg" alt="" width={20} height={20} className="shrink-0" />
              <input
                type="date"
                value={checkin}
                min={today}
                max={checkout || undefined}
                onChange={(e) => setCheckin(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className={`min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none [&::-webkit-calendar-picker-indicator]:hidden ${
                  checkin ? "text-ink" : "text-slate-400"
                }`}
              />
            </div>
          </div>

          {roundTrip && (
            <div className="w-full flex-1 px-4 py-2 text-left md:px-6">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Date retour</label>
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <img src="/calendrier.svg" alt="" width={20} height={20} className="shrink-0" />
                <input
                  type="date"
                  value={checkout}
                  min={checkin || today}
                  onChange={(e) => setCheckout(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className={`min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none [&::-webkit-calendar-picker-indicator]:hidden ${
                    checkout ? "text-ink" : "text-slate-400"
                  }`}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <img src="/carte.svg" alt="" width={20} height={20} className="shrink-0" />
                  <input
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                    onFocus={() => setVenueFocus(true)}
                    onBlur={() => setTimeout(() => setVenueFocus(false), 150)}
                    placeholder="Votre événement"
                    className="w-full bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-slate-400"
                  />
                </div>
                {venueFocus && venueResults.length > 0 && (
                  <ul className="absolute left-3 right-3 z-20 mt-3 max-h-56 overflow-auto rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-line md:left-5 md:right-5">
                    {venueResults.map((v) => (
                      <li key={v.id}>
                        <button
                          onMouseDown={() => {
                            onPickVenue(v.id);
                            setVenueSearch("");
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] hover:bg-mist"
                        >
                          <IconPin size={14} className="shrink-0 text-ember" />
                          <span className="truncate">
                            {v.name} — {v.city}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          </div>

          <div role="radiogroup" className="flex items-center gap-2 px-4 md:px-6">
            {[
              { value: true, label: "Aller-retour" },
              { value: false, label: "Aller simple" },
            ].map((opt) => {
              const active = roundTrip === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRoundTrip(opt.value)}
                  className={`flex-1 rounded-[4px] px-5 py-2.5 text-[13px] font-bold transition-colors ${
                    active
                      ? "bg-navy-700 text-white shadow-lg shadow-navy-700/25"
                      : "bg-white text-slate-600 ring-1 ring-inset ring-line hover:bg-mist"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 md:flex-row md:items-center">
          <div className="w-full flex-1 px-4 py-2 text-left md:px-6">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Date aller</label>
            <div className="flex items-center gap-2.5 whitespace-nowrap">
              <img src="/calendrier.svg" alt="" width={20} height={20} className="shrink-0" />
              <input
                type="date"
                value={checkin}
                max={checkout}
                onChange={(e) => setCheckin(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-slate-400 outline-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
          )}
          </div>

          <div className="px-4 md:px-6">
            <button
              onClick={onCompose}
              disabled={!ready}
              className="flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-ember-ink px-8 text-[15px] font-bold text-white shadow-lg shadow-ember-ink/25 transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-40">
              <IconSearch size={20} /> Créer mon bundle
            </button>
          </div>

          <p className="px-4 text-[13px] text-slate-500 md:px-6 md:text-center">
            <IconLeaf size={14} className="mr-1.5 inline align-text-bottom text-[#0d5c63]" />
            Empreinte carbone affichée pour chaque trajet.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-ink to-navy-700 py-20 text-center md:py-24">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M0 0 L100 100 M100 0 L0 100" fill="none" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-5 md:px-8">
          <h2 className="font-display text-[34px] font-extrabold text-white md:text-[40px]">
            Prêt à écrire votre prochain chapitre&nbsp;?
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-6 md:flex-row">
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/10 p-8 backdrop-blur-md">
              <IconSparkle size={32} className="mx-auto mb-4 text-ember-soft" />
              <h3 className="font-display text-xl font-bold text-white">Tout en un</h3>
              <p className="mt-2 text-sm text-white/60">
                Retrouvez toutes les étapes pour planifier votre prochaine destination&nbsp;!
              </p>
            </div>
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/10 p-8 backdrop-blur-md">
              <IconTicket size={32} className="mx-auto mb-4 text-ember-soft" />
              <h3 className="font-display text-xl font-bold text-white">Votre choix, votre aventure</h3>
              <p className="mt-2 text-sm text-white/60">
                Créer votre propre bundle et vivez votre propre aventure vers votre événement du moment&nbsp;!
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-[11px] tracking-widest text-slate-400 sm:flex-row">
          <span>© 2026 BUNDLE EVENTS</span>
          <div className="flex flex-col items-center gap-2 uppercase sm:flex-row sm:gap-4">
            {[
              "Politique de confidentialité",
              "Conditions d'utilisation",
              "Mentions légales",
            ].map((p) => (
              <a
                key={p}
                href="#"
                className="underline underline-offset-4 transition-colors hover:text-ink"
              >
                {p}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}