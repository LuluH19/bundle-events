import { describe, expect, it } from "vitest";
import { isEmptySegment, removeEmptySegments } from "@/src/utils/algorithms/empty-segments";
import type { RouteSegment, TransportMode } from "@/src/types";

const seg = (mode: TransportMode, distanceKm: number, durationMinutes: number, name: string = mode): RouteSegment => ({
  from: { name: `${name} départ`, coords: { lat: 0, lng: 0 } },
  to: { name: `${name} arrivée`, coords: { lat: 0, lng: 0 } },
  mode,
  coordinates: [],
  distanceKm,
  durationMinutes,
});

describe("isEmptySegment", () => {
  it("repère une étape affichée « 0 min · 0 m »", () => {
    expect(isEmptySegment({ distanceKm: 0, durationMinutes: 0 })).toBe(true);
    expect(isEmptySegment({ distanceKm: 0.04, durationMinutes: 0.4 })).toBe(true);
  });

  it("garde une vraie étape, même courte", () => {
    expect(isEmptySegment({ distanceKm: 0.3, durationMinutes: 0.2 })).toBe(false);
    expect(isEmptySegment({ distanceKm: 0, durationMinutes: 4 })).toBe(false);
  });
});

describe("removeEmptySegments", () => {
  it("retire les faux trains et le transfert vides autour du vrai train", () => {
    const tgv = seg("train", 440, 120, "TGV");
    const result = removeEmptySegments([seg("train", 0, 0), tgv, seg("walking", 0, 0), seg("train", 0, 0)]);
    expect(result).toEqual([tgv]);
  });

  it("garde au moins une étape si tout est vide", () => {
    expect(removeEmptySegments([seg("walking", 0, 0), seg("walking", 0.05, 0)])).toHaveLength(1);
    expect(removeEmptySegments([])).toEqual([]);
  });
});
