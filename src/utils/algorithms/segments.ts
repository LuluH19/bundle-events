import type { LatLng, RouteSegment, TransportMode } from "@/src/types";
import { haversineDistance } from "./geodesic";

/** Two stops closer than this are considered the same station. */
export const SAME_STATION_RADIUS_KM = 0.15;
/** A segment shorter than this, starting and ending on the same station, is noise. */
const DEGENERATE_SEGMENT_KM = 0.3;

const COUNTED_MODES: TransportMode[] = ["plane", "train", "bus"];

export function normalizeStationName(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/^\s*gare\s+(de\s+|d')?/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Stop = { name: string; coords: LatLng };

export function isSameStation(a: Stop, b: Stop): boolean {
  const na = normalizeStationName(a.name);
  const nb = normalizeStationName(b.name);
  if (na && na === nb) return true;
  return haversineDistance(a.coords, b.coords) < SAME_STATION_RADIUS_KM;
}

function sameLine(a: RouteSegment, b: RouteSegment): boolean {
  if (a.mode !== b.mode) return false;
  if (a.mode === "walking") return true;
  return (a.label || "") === (b.label || "") && (a.color || "") === (b.color || "");
}

function joinSegments(a: RouteSegment, b: RouteSegment): RouteSegment {
  const last = a.coordinates[a.coordinates.length - 1];
  const first = b.coordinates[0];
  const skipFirst = last && first && last[0] === first[0] && last[1] === first[1];
  return {
    ...a,
    to: b.to,
    coordinates: [...a.coordinates, ...(skipFirst ? b.coordinates.slice(1) : b.coordinates)],
    distanceKm: a.distanceKm + b.distanceKm,
    durationMinutes: a.durationMinutes + b.durationMinutes,
  };
}

/**
 * Removes zero-length hops on a single station and merges consecutive legs
 * on the same line (or consecutive walks), so each station shows up once.
 */
export function mergeSegments(segments: RouteSegment[]): RouteSegment[] {
  let current = segments;
  for (;;) {
    const next = mergePass(current);
    if (next.length === current.length) return next;
    current = next;
  }
}

function mergePass(segments: RouteSegment[]): RouteSegment[] {
  const kept = segments.filter(
    (s) => !(isSameStation(s.from, s.to) && s.distanceKm < DEGENERATE_SEGMENT_KM)
  );
  // Never erase the whole route (e.g. a very short trip).
  if (kept.length === 0) return segments.slice(0, 1);

  const out: RouteSegment[] = [];
  for (const seg of kept) {
    const prev = out[out.length - 1];
    if (prev && sameLine(prev, seg) && isSameStation(prev.to, seg.from)) {
      out[out.length - 1] = joinSegments(prev, seg);
    } else {
      out.push(seg);
    }
  }
  return out;
}

export interface TransportCount {
  total: number;
  byMode: Partial<Record<TransportMode, number>>;
}

/**
 * Counts the real vehicles to board: train, bus and plane legs.
 * Walking is never counted; a car only counts when it is the whole trip.
 */
export function countTransports(segments: RouteSegment[]): TransportCount {
  const byMode: Partial<Record<TransportMode, number>> = {};
  let total = 0;
  for (const s of segments) {
    if (!COUNTED_MODES.includes(s.mode)) continue;
    byMode[s.mode] = (byMode[s.mode] || 0) + 1;
    total++;
  }
  if (total === 0 && segments.some((s) => s.mode === "car")) {
    return { total: 1, byMode: { car: 1 } };
  }
  return { total, byMode };
}

export function countTransfers(count: TransportCount): number {
  return Math.max(0, count.total - 1);
}

