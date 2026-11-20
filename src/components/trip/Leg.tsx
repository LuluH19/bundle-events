"use client";

import type { FlightInfo, RouteOption, TrainJourney } from "@/src/types";
import { MODE_COLOR, MODE_META, MODE_SHORT } from "@/src/utils/constants/transport";
import { formatDistance, formatDuration, timeOf } from "@/src/utils/format";
import { modeSummary, transferLabel } from "@/src/utils/trip";
import { MODE_ICON } from "@/src/components/ui";

export function ModeBar({ option }: { option: RouteOption }) {
  const total = option.route.segments.reduce((s, seg) => s + Math.max(seg.durationMinutes, 1), 0) || 1;
  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded" aria-hidden>
      {option.route.segments.map((seg, i) => (
        <span
          key={i}
          className="h-full"
          style={{ flexGrow: Math.max(seg.durationMinutes, 1) / total, backgroundColor: MODE_COLOR[seg.mode] }}
        />
      ))}
    </div>
  );
}

export function ModeChip({ mode, label }: { mode: RouteOption["mode"]; label?: string }) {
  const Icon = MODE_ICON[mode];
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold text-white"
      style={{ backgroundColor: MODE_COLOR[mode] }}
    >
      <Icon size={12} className="shrink-0" />
      <span className="min-w-0 break-words">{label || MODE_SHORT[mode]}</span>
    </span>
  );
}

export function LegFacts({ option, journey }: { option: RouteOption; journey?: TrainJourney }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline gap-2 font-mono text-[22px] font-bold tabular-nums tracking-tight text-ink">
        {journey ? (
          <>
            {timeOf(journey.departureAt)} <span className="text-[15px] text-slate-400">→</span> {timeOf(journey.arrivalAt)}
          </>
        ) : (
          formatDuration(option.durationMin)
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-slate-500">
        <span className="font-semibold text-ink">{modeSummary(option)}</span>
        {journey && <span>{formatDuration(option.durationMin)}</span>}
        <span>{transferLabel(option)}</span>
        <span>CO₂ {MODE_META[option.mode].co2.toLowerCase()}</span>
      </div>
      <ModeBar option={option} />
    </div>
  );
}

export function SegmentList({ option, flights }: { option: RouteOption; flights?: FlightInfo[] }) {
  const segments = option.route.segments;
  return (
    <ol className="grid">
      {segments.map((seg, i) => {
        const next = segments[i + 1];
        const isChange = !!next && seg.mode !== "walking" && next.mode !== "walking" && seg.mode !== "car" && next.mode !== "car";
        const label =
          seg.label ||
          (seg.mode === "plane" && flights?.[0] ? `${flights[0].airline} ${flights[0].flightNumber}` : undefined);
        const walk = seg.mode === "walking";
        return (
          <li key={i} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
            <span className="relative flex justify-center">
              <span
                className="relative z-10 mt-1 h-3 w-3 rounded-full border-[3px] bg-white"
                style={{ borderColor: MODE_COLOR[seg.mode] }}
              />
              {i < segments.length - 1 && (
                <span
                  className="absolute top-4 -bottom-1"
                  style={
                    walk
                      ? { width: 3, backgroundImage: `repeating-linear-gradient(${MODE_COLOR.walking} 0 3px, transparent 3px 6px)` }
                      : { width: 4, borderRadius: 2, backgroundColor: MODE_COLOR[seg.mode] }
                  }
                />
              )}
            </span>
            <span className="grid min-w-0 gap-1 pb-3">
              <span className="flex min-w-0 flex-col items-start gap-1 text-[13px] font-semibold text-ink">
                <ModeChip mode={seg.mode} label={label} />
                <span className="min-w-0 max-w-full break-words">
                  {seg.from.name} → {seg.to.name}
                </span>
              </span>
              <span className="text-[12px] text-slate-500">
                {formatDuration(seg.durationMinutes)} · {formatDistance(seg.distanceKm)}
              </span>
              {isChange && (
                <span className="mt-1 rounded-lg bg-billet-soft px-2.5 py-1.5 text-[12px] font-semibold text-ink">
                  Changement à {seg.to.name}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TrainTimes({ journeys }: { journeys: TrainJourney[] }) {
  const j = journeys[0];
  if (!j) return null;
  return (
    <div className="rounded-xl bg-page p-3">
      <p className="text-[12px] font-semibold text-slate-500">Horaires SNCF pour ce jour</p>
      <ul className="mt-1.5 grid gap-1 text-[13px]">
        {j.trains.map((t, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono font-bold tabular-nums text-ink">
              {timeOf(t.departureTime)} → {timeOf(t.arrivalTime)}
            </span>
            <span className="text-slate-600">
              {t.name} {t.number} · {t.departureStation} → {t.arrivalStation}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
