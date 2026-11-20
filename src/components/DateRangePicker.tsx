"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/src/components/Sheet";
import { dateOnly, formatDay, isPastTime, localHourMinute, localIsoDate } from "@/src/utils/date";

export interface DateSelection {
  checkin: string;
  checkout: string;
  arriveBy: string;
  leaveAfter: string;
}

interface DateRangePickerProps {
  open: boolean;
  onClose: () => void;
  roundTrip: boolean;
  onRoundTripChange?: (roundTrip: boolean) => void;
  value: DateSelection;
  onApply: (value: DateSelection) => void;
  eventDates?: string[];
}

const DOW = ["L", "M", "M", "J", "V", "S", "D"];
const ARRIVE_SLOTS = ["12:00", "14:00", "16:00", "18:00", "19:30"];
const LEAVE_SLOTS = ["08:00", "10:00", "12:00", "15:00", "18:00", "23:00"];

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function DateRangePicker(props: DateRangePickerProps) {
  const { open } = props;
  if (!open) return null;
  return <DateRangePickerPanel {...props} />;
}

function DateRangePickerPanel({ onClose, roundTrip: initialRoundTrip, onRoundTripChange, value, onApply, eventDates = [] }: DateRangePickerProps) {
  const now = useMemo(() => new Date(), []);
  const today = localIsoDate(now);
  const nowTime = localHourMinute(now);

  const [from, setFrom] = useState(dateOnly(value.checkin));
  const [to, setTo] = useState(dateOnly(value.checkout));
  const [roundTrip, setRoundTrip] = useState(initialRoundTrip);
  const [pickingReturn, setPickingReturn] = useState(initialRoundTrip && !!value.checkin && !value.checkout);
  const [hovered, setHovered] = useState("");
  const [arriveBy, setArriveBy] = useState(value.arriveBy);
  const [leaveAfter, setLeaveAfter] = useState(value.leaveAfter);
  const [month, setMonth] = useState(monthKey(from || today));

  const sameDay = roundTrip && !!from && from === to;
  const arrivePast = !!from && !!arriveBy && isPastTime(from, arriveBy, now);
  const leaveMin = sameDay && arriveBy ? arriveBy : "";
  const leaveInvalid = !!leaveAfter && !!leaveMin && leaveAfter <= leaveMin;
  const fromToday = from === today;

  const pick = (iso: string) => {
    if (!roundTrip) {
      setFrom(iso);
      setTo("");
    } else if (pickingReturn && from && iso >= from) {
      setTo(iso);
      setPickingReturn(false);
    } else {
      setFrom(iso);
      setTo("");
      setPickingReturn(true);
    }
    if (iso === today && arriveBy && arriveBy <= nowTime) setArriveBy("");
  };

  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(localIsoDate(new Date(y, m - 1, d)));

  const missingReturn = roundTrip && (!to || pickingReturn);
  const canApply = !!from && !missingReturn && !arrivePast && !leaveInvalid;

  const apply = () => {
    if (!canApply) return;
    if (roundTrip !== initialRoundTrip) onRoundTripChange?.(roundTrip);
    onApply({
      checkin: from,
      checkout: roundTrip ? to : "",
      arriveBy,
      leaveAfter: roundTrip ? leaveAfter : "",
    });
    onClose();
  };

  const switchRoundTrip = (v: boolean) => {
    setRoundTrip(v);
    setTo("");
    setLeaveAfter("");
    setPickingReturn(v && !!from);
  };

  const previewEnd = roundTrip && pickingReturn && from && hovered && hovered >= from ? hovered : "";
  const rangeEnd = to || previewEnd;

  const arriveHelp = !arriveBy
    ? fromToday
      ? `Sans heure : on cherche les départs à partir de maintenant (${nowTime}).`
      : "Sans heure : on cherche les départs du matin."
    : arrivePast
      ? `${arriveBy} est déjà passé aujourd'hui : choisis une heure après ${nowTime}, ou « Peu importe ».`
      : `On cherche les trajets qui arrivent avant ${arriveBy}.${fromToday ? " S'il est trop tard, on te propose le premier départ possible." : ""}`;

  const leaveHelp = sameDay
    ? `Retour le même jour : il part au plus tôt après ton arrivée${arriveBy ? ` (${arriveBy})` : ""}. Pas d'hôtel proposé, tu pourras en ajouter un si tu veux.`
    : leaveAfter
      ? `On cherche les retours qui partent après ${leaveAfter}.`
      : "Sans heure : on propose le premier retour après 10:00, l'heure habituelle de départ des hôtels.";

  const chip = (active: boolean, disabled: boolean) =>
    `shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset transition-colors ${
      active ? "bg-nuit text-white ring-nuit" : "bg-white text-ink ring-line hover:bg-mist"
    } ${disabled ? "opacity-40 line-through" : ""}`;

  return (
    <Sheet
      open
      title={roundTrip ? "Tes dates" : "Ta date"}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={apply}
          disabled={!canApply}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-billet text-[16px] font-bold text-white transition-colors hover:bg-billet-600 disabled:opacity-45"
        >
          {missingReturn && from ? "Choisis le jour du retour" : "Valider les dates"}
        </button>
      }
    >
      {onRoundTripChange && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-page p-1" role="radiogroup" aria-label="Type de trajet">
          {[
            { value: true, label: "Aller-retour" },
            { value: false, label: "Aller simple" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="radio"
              aria-checked={roundTrip === opt.value}
              onClick={() => switchRoundTrip(opt.value)}
              className={`rounded-lg py-2 text-[14px] font-semibold transition-colors ${
                roundTrip === opt.value ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-slate-500 hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-2 ${roundTrip ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          onClick={() => setPickingReturn(false)}
          className={`rounded-xl bg-white px-3 py-2 text-left ring-inset ${roundTrip && !pickingReturn ? "ring-2 ring-billet" : "ring-1 ring-line"}`}
        >
          <span className="block text-[12px] font-semibold text-slate-500">Aller</span>
          <span className={`block text-[15px] font-bold ${from ? "text-ink" : "text-slate-400"}`}>{from ? formatDay(from) : "Choisir"}</span>
        </button>
        {roundTrip && (
          <button
            type="button"
            onClick={() => from && setPickingReturn(true)}
            disabled={!from}
            className={`rounded-xl bg-white px-3 py-2 text-left ring-inset ${pickingReturn && from ? "ring-2 ring-billet" : "ring-1 ring-line"}`}
          >
            <span className="block text-[12px] font-semibold text-slate-500">Retour</span>
            <span className={`block text-[15px] font-bold ${rangeEnd ? "text-ink" : "text-slate-400"}`}>
              {rangeEnd ? formatDay(rangeEnd) : "Choisir"}
            </span>
          </button>
        )}
      </div>


      <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-line">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            disabled={month <= monthKey(today)}
            aria-label="Mois précédent"
            className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-line disabled:opacity-35"
          >
            ‹
          </button>
          <span className="text-[15px] font-bold text-ink">{monthLabel(month)}</span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Mois suivant"
            className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-line"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center" onMouseLeave={() => setHovered("")}>
          {DOW.map((d, i) => (
            <span key={i} className="font-mono text-[11px] font-bold leading-8 text-slate-500">
              {d}
            </span>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <span key={`e${i}`} />;
            const past = iso < today;
            const isStart = iso === from;
            const isEnd = !!rangeEnd && iso === rangeEnd;
            const isReturn = !!to && iso === to;
            const selected = isStart || isReturn;
            const preview = !to && isEnd && !isStart;
            const inRange = !!from && !!rangeEnd && iso > from && iso < rangeEnd;
            const band = !!from && !!rangeEnd && from !== rangeEnd && (inRange || isStart || isEnd);
            const isToday = iso === today;
            const hasEvent = eventDates.includes(iso);
            const label = new Date(`${iso}T00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
            return (
              <div key={iso} className="relative">
                {band && (
                  <span
                    aria-hidden
                    className={`absolute inset-y-0 ${isStart ? "left-1/2 right-0" : isEnd ? "left-0 right-1/2" : "inset-x-0"} ${
                      to ? "bg-billet-soft" : "bg-billet-soft/60"
                    }`}
                  />
                )}
                <button
                  type="button"
                  disabled={past}
                  onClick={() => pick(iso)}
                  onMouseEnter={() => setHovered(iso)}
                  onFocus={() => setHovered(iso)}
                  aria-pressed={selected}
                  aria-label={`${label}${isToday ? ", aujourd'hui" : ""}${past ? ", passé" : ""}${isStart ? ", aller" : ""}${isReturn ? ", retour" : ""}`}
                  className={`relative aspect-square w-full min-w-0 rounded-full text-[14px] font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-line disabled:line-through ${
                    selected
                      ? "bg-billet text-white"
                      : preview
                        ? "bg-white text-billet ring-2 ring-inset ring-billet"
                        : inRange
                          ? "text-ink"
                          : "text-ink hover:bg-mist"
                  } ${isToday && !selected && !preview ? "ring-[1.5px] ring-inset ring-ink" : ""}`}
                >
                  {Number(iso.slice(8))}
                  {hasEvent && (
                    <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${selected ? "bg-white" : "bg-billet"}`} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
        {eventDates.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-billet" /> Date de l&apos;événement
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-2">
        <label htmlFor="arrive-by" className="text-[15px] font-bold text-ink">
          Aller · arriver avant <span className="text-[12px] font-medium text-slate-500">facultatif</span>
        </label>
        <input
          id="arrive-by"
          type="time"
          step={1800}
          value={arriveBy}
          min={fromToday ? nowTime : undefined}
          onChange={(e) => setArriveBy(e.target.value)}
          className="rounded-xl bg-white px-3 py-2.5 font-mono text-[16px] font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-train"
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {ARRIVE_SLOTS.map((t) => {
            const disabled = fromToday && t <= nowTime;
            return (
              <button key={t} type="button" disabled={disabled} onClick={() => setArriveBy(t)} className={chip(arriveBy === t, disabled)}>
                {t}
              </button>
            );
          })}
          <button type="button" onClick={() => setArriveBy("")} className={chip(!arriveBy, false)}>
            Peu importe
          </button>
        </div>
        <p className={`text-[13px] ${arrivePast ? "font-semibold text-billet" : "text-slate-500"}`}>{arriveHelp}</p>
      </div>

      {roundTrip && !missingReturn && (
        <div className="mt-5 grid gap-2">
          <label htmlFor="leave-after" className="text-[15px] font-bold text-ink">
            Retour · partir après <span className="text-[12px] font-medium text-slate-500">facultatif</span>
          </label>
          <input
            id="leave-after"
            type="time"
            step={1800}
            value={leaveAfter}
            min={leaveMin || undefined}
            onChange={(e) => setLeaveAfter(e.target.value)}
            className="rounded-xl bg-white px-3 py-2.5 font-mono text-[16px] font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-train"
          />
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {LEAVE_SLOTS.map((t) => {
              const disabled = !!leaveMin && t <= leaveMin;
              return (
                <button key={t} type="button" disabled={disabled} onClick={() => setLeaveAfter(t)} className={chip(leaveAfter === t, disabled)}>
                  {t}
                </button>
              );
            })}
            <button type="button" onClick={() => setLeaveAfter("")} className={chip(!leaveAfter, false)}>
              Peu importe
            </button>
          </div>
          <p className={`text-[13px] ${leaveInvalid ? "font-semibold text-billet" : "text-slate-500"}`}>
            {leaveInvalid ? `Le retour doit partir après ton arrivée (${leaveMin}).` : leaveHelp}
          </p>
        </div>
      )}
    </Sheet>
  );
}
