export function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function toDatetimeLocalValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isPastDatetimeLocal(value: string, now: Date = new Date()): boolean {
  if (!value) return false;
  return value < toDatetimeLocalValue(now);
}

export function isDatetimeLocalAfter(value: string, than: string): boolean {
  if (!value || !than) return false;
  return value > than;
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = dateOnly(iso).split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days));
  return date.toISOString().slice(0, 10);
}

export function toSncfDateTime(iso: string): string {
  if (!iso) return "";
  const [datePart, timePart = "00:00"] = iso.split("T");
  const date = datePart.replace(/-/g, "");
  if (date.length !== 8) return "";
  const [h = "00", m = "00", s = "00"] = timePart.split(":");
  return `${date}T${h.padStart(2, "0")}${m.padStart(2, "0")}${s.padStart(2, "0")}`;
}

export function getDaysDiff(checkin: string, checkout: string): number {
  if (!checkin) return 1;
  const start = dateOnly(checkin);
  const end = checkout ? dateOnly(checkout) : addDaysIso(start, 1);
  const from = Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10)));
  const to = Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)));
  const diff = Math.round((to - from) / 86400000);
  return Number.isFinite(diff) ? Math.max(1, diff) : 1;
}

export function formatSncfDate(sncfDate: string): string {
  if (sncfDate.length < 15) return sncfDate;
  const y = sncfDate.substring(0, 4);
  const m = sncfDate.substring(4, 6);
  const d = sncfDate.substring(6, 8);
  const h = sncfDate.substring(9, 11);
  const min = sncfDate.substring(11, 13);
  const s = sncfDate.substring(13, 15);
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

export type SearchRepresents = "departure" | "arrival";

export interface SearchDateTime {
  iso: string;
  represents: SearchRepresents;
}

export const DEFAULT_OUTBOUND_TIME = "08:00";
export const DEFAULT_RETURN_TIME = "10:00";

export function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localHourMinute(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function isPastTime(dateISO: string, time: string, now: Date): boolean {
  if (!dateISO || !time) return false;
  const day = dateOnly(dateISO);
  const today = localIsoDate(now);
  if (day < today) return true;
  return day === today && time <= localHourMinute(now);
}

export function outboundSearch(checkin: string, arriveBy: string | undefined, now: Date): SearchDateTime | null {
  const day = dateOnly(checkin);
  if (!day) return null;
  if (arriveBy && !isPastTime(day, arriveBy, now)) return { iso: `${day}T${arriveBy}`, represents: "arrival" };
  if (day === localIsoDate(now)) return { iso: `${day}T${localHourMinute(now)}`, represents: "departure" };
  if (checkin.length > 10) return { iso: checkin, represents: "departure" };
  return { iso: `${day}T${DEFAULT_OUTBOUND_TIME}`, represents: "departure" };
}

export function returnSearch(
  returnDay: string,
  leaveAfter: string | undefined,
  now: Date,
  minTime?: string
): SearchDateTime | null {
  const day = dateOnly(returnDay);
  if (!day) return null;
  let time = leaveAfter || minTime || DEFAULT_RETURN_TIME;
  if (minTime && time < minTime) time = minTime;
  if (isPastTime(day, time, now)) time = localHourMinute(now);
  return { iso: `${day}T${time}`, represents: "departure" };
}

export function formatDay(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${dateOnly(iso)}T00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
