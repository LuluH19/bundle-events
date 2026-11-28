import type { Venue } from "@/src/types";

const MAX_TEXT = 200;

const clip = (v: string | null) => (v ?? "").trim().slice(0, MAX_TEXT);

export function venueLink(v: Venue): string {
  const params = new URLSearchParams({
    evenement: v.name,
    lat: v.coords.lat.toFixed(6),
    lng: v.coords.lng.toFixed(6),
    id: v.id,
  });
  if (v.city) params.set("ville", v.city);
  if (v.address) params.set("adresse", v.address);
  if (v.dateLabel) params.set("date", v.dateLabel);
  return `/?${params}`;
}

export function parseVenueLink(search: string): Venue | null {
  const sp = new URLSearchParams(search);
  const name = clip(sp.get("evenement"));
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!name || !sp.get("lat") || !sp.get("lng")) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const id = clip(sp.get("id")) || `link-${lat.toFixed(5)},${lng.toFixed(5)}`;
  const dateLabel = clip(sp.get("date"));
  return {
    id,
    name,
    address: clip(sp.get("adresse")),
    coords: { lat, lng },
    city: clip(sp.get("ville")),
    ...(dateLabel ? { dateLabel } : {}),
  };
}
