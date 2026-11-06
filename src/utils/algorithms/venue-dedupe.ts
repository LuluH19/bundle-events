import type { Venue } from "@/src/types";
import { haversineDistance } from "./geodesic";

const SAME_PLACE_KM = 2;

/** Lowercase, strip accents/punctuation, collapse spaces ("Parc Astérix" ≡ "parc-asterix"). */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const isPlace = (v: Venue) => v.id.startsWith("poi-") || v.id.startsWith("osm-");

function isSamePlace(a: Venue, b: Venue): boolean {
  const na = normalizeName(a.name);
  const nb = normalizeName(b.name);
  const km = haversineDistance(a.coords, b.coords);
  if (na === nb) return km < (isPlace(a) && isPlace(b) ? SAME_PLACE_KM : 0.05);
  // Fuzzy match only between place sources (Mapbox/OSM), never between events:
  // distinct events can have nested titles ("Concert" / "Concert de jazz").
  if (!isPlace(a) || !isPlace(b)) return false;
  return (na.includes(nb) || nb.includes(na)) && km < SAME_PLACE_KM;
}

/** Keeps the first of each group of venues describing the same place. */
export function dedupeVenues(venues: Venue[]): Venue[] {
  const kept: Venue[] = [];
  for (const v of venues) {
    if (!kept.some((k) => isSamePlace(k, v))) kept.push(v);
  }
  return kept;
}

/** 0 = exact name, 1 = prefix, 2 = word prefix, 3 = substring, 4 = matched elsewhere (city, address). */
function relevance(v: Venue, q: string): number {
  const name = normalizeName(v.name);
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(" ").some((w) => w.startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  return 4;
}

/** Sorts by how well the name matches the query; stable, so source order breaks ties. */
export function rankVenues(venues: Venue[], query: string): Venue[] {
  const q = normalizeName(query);
  return venues
    .map((v, i) => ({ v, i, r: relevance(v, q) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.v);
}
