export function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
