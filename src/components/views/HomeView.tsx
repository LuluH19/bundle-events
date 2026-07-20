"use client";

import { useMemo } from "react";
import Image from "next/image";
import { HomeViewProps } from "@/src/types";
import { isoPlusDays } from "@/src/utils/date";
import {
  IconPin,
  IconLeaf,
  IconClose,
  IconSearch,
  IconSparkle,
  IconTicket,
} from "@/src/components/ui";

function formatDateTime(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00` : iso);
  const date = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} • ${time}`;
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
  
  const ready = !!(departure && venue && checkin && checkout);
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
          <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative w-full flex-1 text-left">
            <label className="mb-1.5 block px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">De</label>
            {departure ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-white/35 px-3 py-2.5">
                <Image
                  src="/cible.svg"
                  alt=""
                  width={20}
                  height={20}
                  quality={75}
                  loading="lazy"
                  preload={false}
                  decoding="async"
                  placeholder="empty"
                  unoptimized
                  className="shrink-0"
                />
                <span className="flex-1 truncate text-[16px] font-medium text-ink">{departure.name}</span>
                <button onClick={onClearDeparture} className="text-slate-400 hover:text-ember">
                  <IconClose size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 rounded-lg bg-white/35 px-3 py-2.5">
                  <Image
                    src="/cible.svg"
                    alt=""
                    width={20}
                    height={20}
                    quality={75}
                    loading="lazy"
                    preload={false}
                    decoding="async"
                    placeholder="empty"
                    unoptimized
                    className="shrink-0"
                  />
                  <input
                    value={depSearch}
                    onChange={(e) => setDepSearch(e.target.value)}
                    onFocus={() => setDepFocus(true)}
                    onBlur={() => setTimeout(() => setDepFocus(false), 150)}
                    placeholder="Lieu du départ"
                    className="w-full bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-slate-400"
                  />
                </div>
                {depFocus && depResults.length > 0 && (
                  <ul className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-line">
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

          <div className="relative w-full flex-1 text-left">
            <label className="mb-1.5 block px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Vers</label>
            {venue ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-white/35 px-3 py-2.5">
                <Image
                  src="/carte.svg"
                  alt=""
                  width={20}
                  height={20}
                  quality={75}
                  loading="lazy"
                  preload={false}
                  decoding="async"
                  placeholder="empty"
                  unoptimized
                  className="shrink-0"
                />
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
                <div className="flex items-center gap-2.5 rounded-lg bg-white/35 px-3 py-2.5">
                  <Image
                    src="/carte.svg"
                    alt=""
                    width={20}
                    height={20}
                    quality={75}
                    loading="lazy"
                    preload={false}
                    decoding="async"
                    placeholder="empty"
                    unoptimized
                    className="shrink-0"
                  />
                  <input
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                    onFocus={() => setVenueFocus(true)}
                    onBlur={() => setTimeout(() => setVenueFocus(false), 150)}
                    placeholder="Lieu de l'évènement"
                    className="w-full bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-slate-400"
                  />
                </div>
                {venueFocus && venueResults.length > 0 && (
                  <ul className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-line">
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

          <div role="radiogroup" className="flex h-14 w-full overflow-hidden rounded-lg ring-1 ring-inset ring-line">
            {[
              { value: true, label: "Aller-retour" },
              { value: false, label: "Aller simple" },
            ].map((opt, i) => {
              const active = roundTrip === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setRoundTrip(opt.value);
                    if (!opt.value) setCheckout("");
                  }}
                  className={`group relative flex h-full flex-1 items-center justify-center overflow-hidden px-5 text-[13px] font-bold ring-inset transition-all duration-300 ${
                    i > 0 ? "rounded-r-lg border-l border-line" : "rounded-l-lg"
                  } ${
                    active
                      ? "bg-navy-700 text-white ring-0 ring-white/50 hover:bg-navy-800 hover:ring-2"
                      : "bg-white text-slate-600 ring-0 ring-navy-700/40 hover:bg-mist hover:text-ink hover:ring-2"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-[-20deg] transition-transform duration-[1100ms] ease-out group-hover:translate-x-[120%] ${
                      active
                        ? "bg-linear-to-r from-transparent via-white/25 to-transparent"
                        : "bg-linear-to-r from-transparent via-navy-700/10 to-transparent"
                    }`}
                  />
                  <span className="relative transition-transform duration-300 ease-out group-hover:scale-110">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
          <div className="w-full flex-1 text-left">
            <label className="mb-1.5 block px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Aller</label>
            <div className="relative flex items-center gap-2.5 rounded-lg bg-white/35 px-3 py-2.5">
              <Image
                src="/calendrier.svg"
                alt=""
                width={20}
                height={20}
                quality={75}
                loading="lazy"
                preload={false}
                decoding="async"
                placeholder="empty"
                unoptimized
                className="shrink-0"
              />
              <span className={`flex-1 truncate text-[16px] font-medium ${checkin ? "text-ink" : "text-slate-400"}`}>
                {checkin ? formatDateTime(checkin) : "sam. 11 juil. • 23:00"}
              </span>
              <input
                type="datetime-local"
                value={checkin}
                min={today}
                max={checkout || undefined}
                onChange={(e) => setCheckin(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                aria-label="Date et heure aller"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          </div>

          {roundTrip && (
          <div className="w-full flex-1 text-left">
            <label className="mb-1.5 block px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Retour</label>
            <div className="relative flex items-center gap-2.5 rounded-lg bg-white/35 px-3 py-2.5">
              <Image
                src="/calendrier.svg"
                alt=""
                width={20}
                height={20}
                quality={75}
                loading="lazy"
                preload={false}
                decoding="async"
                placeholder="empty"
                unoptimized
                className="shrink-0"
              />
              <span className={`flex-1 truncate text-[16px] font-medium ${checkout ? "text-ink" : "text-slate-400"}`}>
                {checkout ? formatDateTime(checkout) : "sam. 11 juil. • 23:00"}
              </span>
              <input
                type="datetime-local"
                value={checkout}
                min={checkin || today}
                onChange={(e) => setCheckout(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                aria-label="Date et heure retour"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          </div>
          )}
          </div>

          <button
            onClick={onCompose}
            disabled={!ready}
            className="flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-ember-ink px-8 text-[15px] font-bold text-white shadow-lg shadow-ember-ink/25 transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-40">
            <IconSearch size={20} /> Créer mon bundle
          </button>

          <p className="px-3 text-[13px] text-slate-500 md:text-center">
            <IconLeaf size={14} className="mr-1.5 inline align-text-bottom text-[#0d5c63]" />
            Empreinte carbone affichée pour chaque trajet.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-ink to-navy-700 py-20 text-center md:py-24">
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-[13px] font-medium tracking-widest text-slate-600 sm:flex-row">
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