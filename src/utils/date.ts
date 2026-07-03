export function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
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
  const d1 = new Date(checkin);
  const d2 = new Date(checkout);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
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
