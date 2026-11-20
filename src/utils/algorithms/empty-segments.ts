import type { RouteSegment } from "@/src/types";

export const EMPTY_SEGMENT_MAX_KM = 0.1;

export function isEmptySegment(seg: Pick<RouteSegment, "distanceKm" | "durationMinutes">): boolean {
  return Math.round(seg.durationMinutes) === 0 && seg.distanceKm < EMPTY_SEGMENT_MAX_KM;
}

export function removeEmptySegments(segments: RouteSegment[]): RouteSegment[] {
  const kept = segments.filter((s) => !isEmptySegment(s));
  if (kept.length > 0) return kept;
  const longest = segments.reduce<RouteSegment | undefined>((a, b) => (!a || b.distanceKm > a.distanceKm ? b : a), undefined);
  return longest ? [longest] : [];
}
