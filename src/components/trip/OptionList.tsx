"use client";

import type { RouteOption, TripPreference } from "@/src/types";
import { optionBadges } from "@/src/utils/algorithms/recommend";
import { formatDuration } from "@/src/utils/format";
import { MODE_META } from "@/src/utils/constants/transport";
import { modeSummary, transferLabel } from "@/src/utils/trip";
import { ModeBar } from "@/src/components/trip/Leg";

export const PREFERENCE_LABEL: Record<TripPreference, string> = {
  fast: "Le plus rapide",
  cheap: "Le moins cher",
  green: "Le plus vert",
};

interface OptionListProps {
  options: RouteOption[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function OptionList({ options, selectedId, loading, onSelect }: OptionListProps) {
  const badges = optionBadges(options);

  if (loading) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-mist" />
        ))}
      </div>
    );
  }

  if (!options.length) {
    return (
      <p className="rounded-2xl bg-mist p-4 text-[14px] text-slate-500">
        Aucun trajet trouvé pour ce parcours. Vérifie le point de départ ou essaie une autre date.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {options.map((o) => {
        const selected = o.id === selectedId;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            aria-pressed={selected}
            className={`grid gap-2 rounded-2xl bg-white p-4 text-left ring-inset transition-shadow ${
              selected ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-ink/40"
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex flex-wrap gap-1.5">
                {(badges[o.id] ?? []).map((b) => (
                  <span key={b} className="rounded-md bg-nuit-doux px-1.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
                    {PREFERENCE_LABEL[b]}
                  </span>
                ))}
                {!badges[o.id] && <span className="text-[13px] font-semibold text-ink">{modeSummary(o)}</span>}
              </span>
              <span className="shrink-0 font-display text-[20px] font-extrabold text-ink">{o.price} €</span>
            </span>
            <span className="font-mono text-[20px] font-bold tabular-nums text-ink">{formatDuration(o.durationMin)}</span>
            <span className="flex flex-wrap gap-x-3 text-[13px] text-slate-500">
              {badges[o.id] && <span className="font-semibold text-ink">{modeSummary(o)}</span>}
              <span>{transferLabel(o)}</span>
              <span>CO₂ {MODE_META[o.mode].co2.toLowerCase()}</span>
            </span>
            <ModeBar option={o} />
          </button>
        );
      })}
      <p className="text-[12px] text-slate-500">Prix estimés. Le prix exact s&apos;affiche sur le site de réservation.</p>
    </div>
  );
}
