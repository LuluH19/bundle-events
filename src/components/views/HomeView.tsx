"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import posthog from "posthog-js";
import type { HomeViewProps, Venue } from "@/src/types";
import { searchEventIdeas } from "@/src/services/events";
import { EVENT_CATEGORIES } from "@/src/utils/constants/event-categories";
import { socialConfig } from "@/src/config";
import { IconCalendar, IconClose, IconInstagram, IconPin, IconSearch, IconShare, IconSliders, IconTicket } from "@/src/components/ui";

interface Suggestion {
  key: string;
  title: string;
  subtitle?: string;
}

interface SearchFieldProps {
  divided?: boolean;
  id: string;
  label: string;
  icon: ReactNode;
  placeholder: string;
  selected: string | null;
  query: string;
  onQuery: (v: string) => void;
  suggestions: Suggestion[];
  onPick: (key: string) => void;
  onClear: () => void;
  loading?: boolean;
}

function SearchField({ id, label, icon, placeholder, selected, query, onQuery, suggestions, onPick, onClear, divided, loading = false }: SearchFieldProps) {
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(0);
  const open = focus && !selected && (suggestions.length > 0 || loading);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onPick(suggestions[active]?.key ?? suggestions[0].key);
    } else if (e.key === "Escape") {
      setFocus(false);
    }
  };

  return (
    <div className="relative min-w-0">
      <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-page ${divided ? "md:border-l md:border-line" : ""}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-page text-ink">{icon}</span>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-[12px] font-semibold text-slate-500">
            {label}
          </label>
          {selected ? (
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-ink">{selected}</span>
              <button type="button" onClick={onClear} aria-label={`Effacer : ${label}`} className="text-slate-400 hover:text-billet">
                <IconClose size={16} />
              </button>
            </div>
          ) : (
            <input
              id={id}
              value={query}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${id}-list`}
              onChange={(e) => {
                onQuery(e.target.value);
                setActive(0);
              }}
              onFocus={() => setFocus(true)}
              onBlur={() => setTimeout(() => setFocus(false), 150)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-slate-400"
            />
          )}
        </div>
      </div>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-busy={loading}
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-line"
        >
          {loading && (
            <li role="presentation" className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-500">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-billet" aria-hidden />
              Recherche…
            </li>
          )}
          {suggestions.map((s, i) => (
            <li key={s.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={() => onPick(s.key)}
                className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] ${i === active ? "bg-page" : "hover:bg-page"}`}
              >
                <IconPin size={14} className="mt-0.5 shrink-0 text-billet" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{s.title}</span>
                  {s.subtitle && <span className="block truncate text-[12px] text-slate-500">{s.subtitle}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CITIES = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse", "Nantes"];
const ALL_CITIES = "Toutes";
const ALL_CATEGORIES = { id: "", label: "Tout" };

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold ring-1 ring-inset ${
        active ? "bg-nuit text-white ring-nuit" : "bg-white text-ink ring-line hover:bg-mist"
      }`}
    >
      {label}
    </button>
  );
}

function CityIdeas({ onPick }: { onPick: (v: Venue) => void }) {
  const [city, setCity] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [ideas, setIdeas] = useState<Record<string, Venue[]>>({});
  const key = `${category}|${city ?? ALL_CITIES}`;
  const results = ideas[key];
  const loading = results === undefined;
  const categoryLabel = EVENT_CATEGORIES.find((c) => c.id === category)?.label.toLowerCase();

  useEffect(() => {
    if (ideas[key] !== undefined) return;
    let cancelled = false;
    searchEventIdeas(city ? [city] : CITIES, category || undefined)
      .catch(() => [] as Venue[])
      .then((r) => {
        if (!cancelled) setIdeas((prev) => ({ ...prev, [key]: r }));
      });
    return () => {
      cancelled = true;
    };
  }, [city, category, key, ideas]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <h2 className="font-display text-[26px] font-extrabold text-ink md:text-[32px]">Des idées de sortie</h2>
      <div role="group" aria-label="Type d'événement" className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {[ALL_CATEGORIES, ...EVENT_CATEGORIES].map((c) => (
          <Chip
            key={c.id || "all"}
            active={c.id === category}
            label={c.label}
            onClick={() => {
              const next = c.id === category ? "" : c.id;
              posthog.capture("event_ideas_filtered", { city: city ?? ALL_CITIES, category: next || ALL_CATEGORIES.label });
              setCategory(next);
            }}
          />
        ))}
      </div>
      <div role="group" aria-label="Ville" className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
        {[ALL_CITIES, ...CITIES].map((c) => (
          <Chip
            key={c}
            active={c === (city ?? ALL_CITIES)}
            label={c}
            onClick={() => {
              const next = c === ALL_CITIES || c === city ? null : c;
              posthog.capture("event_ideas_filtered", { city: next ?? ALL_CITIES, category: category || ALL_CATEGORIES.label });
              setCity(next);
            }}
          />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading && [0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mist" />)}
        {!loading && results.length === 0 && (
          <p className="text-[14px] text-slate-500">
            {`Rien trouvé${categoryLabel ? ` en ${categoryLabel}` : ""}${city ? ` à ${city}` : ""} pour l'instant.`} Tape directement le nom de la salle plus haut.
          </p>
        )}
        {!loading &&
          results.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onPick(v)}
              className="flex h-full flex-col items-start gap-1 rounded-2xl bg-white p-4 text-left ring-1 ring-line transition-shadow hover:ring-ink/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-billet-soft text-billet">
                <IconTicket size={18} />
              </span>
              <b className="mt-1 text-[15px] leading-snug text-ink">{v.name}</b>
              <span className="mt-auto pt-2 text-[13px] text-slate-500">
                {v.city}
                {v.dateLabel ? ` · ${v.dateLabel}` : ""}
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}

const REASONS = [
  { icon: IconSearch, title: "Une recherche au lieu de cinq sites", text: "Trajet porte à porte, hôtel et retour réunis, sans jongler entre les onglets." },
  { icon: IconSliders, title: "Un voyage complet, tout est modifiable", text: "On te propose le plus rapide, le moins cher ou le plus vert. Tu changes ce que tu veux." },
  { icon: IconShare, title: "Un lien pour toute ta bande", text: "Partage ton voyage en un lien ou un QR code. Chacun voit le même plan." },
];

export function HomeView(props: HomeViewProps) {
  const {
    departure,
    venue,
    depSearch,
    setDepSearch,
    depResults,
    onPickDeparture,
    onClearDeparture,
    venueSearch,
    setVenueSearch,
    venueResults,
    venueSearching,
    onPickVenue,
    onClearVenue,
    dateLabel,
    onOpenDates,
    canCompose,
    composing,
    onCompose,
  } = props;

  return (
    <div>
      <section className="relative z-10 bg-nuit pb-14 pt-12 md:pb-20 md:pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <Image src="/images/concert-crowd-hd.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,21,58,0.78),rgba(22,21,58,0.9))]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 md:px-8">
          <span className="eyebrow text-white/70">Concerts · matchs · festivals</span>
          <h1 className="mt-3 max-w-[16ch] font-display text-[40px] font-extrabold leading-[1] tracking-[-0.02em] text-white md:text-[64px]">
            Tu as ton billet ? On s&apos;occupe du reste.
          </h1>

          <form
            id="search-card"
            onSubmit={(e) => {
              e.preventDefault();
              if (canCompose) onCompose();
            }}
            className="mt-8 grid gap-1 rounded-2xl bg-white p-2 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)] md:grid-cols-[1fr_1.2fr_1fr_auto] md:items-center"
          >
            <SearchField
              id="departure"
              label="Tu pars d'où ?"
              icon={<IconPin size={18} />}
              placeholder="Adresse, gare ou ville"
              selected={departure?.name ?? null}
              query={depSearch}
              onQuery={setDepSearch}
              suggestions={depResults.map((r, i) => ({ key: String(i), title: r.displayName.split(",")[0], subtitle: r.address || r.displayName }))}
              onPick={(k) => {
                const r = depResults[Number(k)];
                if (r) onPickDeparture(r);
              }}
              onClear={onClearDeparture}
            />
            <SearchField
              divided
              id="venue"
              label="Pour quel événement ?"
              icon={<IconTicket size={18} />}
              placeholder="Salle, stade, festival…"
              selected={venue?.name ?? null}
              query={venueSearch}
              onQuery={setVenueSearch}
              suggestions={venueResults.map((v) => ({
                key: v.id,
                title: v.name,
                subtitle: [v.city, v.dateLabel].filter(Boolean).join(" · "),
              }))}
              onPick={(k) => {
                const v = venueResults.find((x) => x.id === k);
                if (v) onPickVenue(v, "search");
              }}
              onClear={onClearVenue}
              loading={venueSearching}
            />
            <button
              type="button"
              onClick={onOpenDates}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-page md:border-l md:border-line"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-page text-ink">
                <IconCalendar size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-slate-500">Quand ?</span>
                <span className={`block truncate text-[16px] font-semibold ${dateLabel ? "text-ink" : "font-medium text-slate-400"}`}>
                  {dateLabel || "Choisir les dates"}
                </span>
              </span>
            </button>
            <button
              type="submit"
              disabled={!canCompose || composing}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-billet px-6 text-[16px] font-bold text-white transition-colors hover:bg-billet-600 disabled:opacity-45"
            >
              <IconSearch size={18} /> {composing ? "Préparation…" : "Voir mon voyage"}
            </button>
          </form>

        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12 md:px-8">
        <div className="grid gap-3 md:grid-cols-3">
          {REASONS.map((r) => (
            <div key={r.title} className="grid gap-1.5 rounded-2xl bg-white p-5 ring-1 ring-line">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-soft text-ember">
                <r.icon size={20} />
              </span>
              <b className="text-[16px] text-ink">{r.title}</b>
              <p className="text-[14px] text-slate-500">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <CityIdeas onPick={(v) => onPickVenue(v, "home_ideas")} />

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-[13px] text-slate-500 sm:flex-row md:px-8">
          <span>© 2026 Bundle Events</span>
          <a
            href={socialConfig.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Suivre Bundle Events sur ${socialConfig.instagram.label}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-ink transition-colors hover:bg-mist hover:text-billet"
          >
            <IconInstagram size={18} />
            {socialConfig.instagram.handle}
          </a>
        </div>
      </footer>
    </div>
  );
}
