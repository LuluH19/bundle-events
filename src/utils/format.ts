export function formatDuration(min: number) {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function timeOf(s: string) {
  return new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function capitalizeFirst(text: string): string {
  return text.trim().replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}
