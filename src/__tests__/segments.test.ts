import { describe, it, expect } from "vitest";
import type { RouteSegment, TransportMode } from "@/src/types";
import {
  normalizeStationName,
  isSameStation,
  mergeSegments,
  countTransports,
  countTransfers,
} from "@/src/utils/algorithms/segments";

function seg(
  from: string,
  to: string,
  mode: TransportMode,
  opts: { label?: string; km?: number; fromLat?: number; toLat?: number } = {}
): RouteSegment {
  const km = opts.km ?? 10;
  const fromLat = opts.fromLat ?? 48.89;
  const toLat = opts.toLat ?? (fromLat + km / 111);
  return {
    from: { name: from, coords: { lat: fromLat, lng: 2 } },
    to: { name: to, coords: { lat: toLat, lng: 2 } },
    mode,
    coordinates: [[fromLat, 2], [toLat, 2]],
    distanceKm: km,
    durationMinutes: 10,
    label: opts.label,
  };
}

describe("normalizeStationName", () => {
  it("ignores city suffixes, accents and punctuation", () => {
    const a = normalizeStationName("Saint-Germain-en-Laye");
    expect(normalizeStationName("Saint-Germain-en-Laye (Saint-Germain-en-Laye)")).toBe(a);
    expect(normalizeStationName("Saint-Germain-en-Laye [Saint-Germain-en-Laye]")).toBe(a);
    expect(normalizeStationName("Gare de Bordeaux Saint-Jean")).toBe(
      normalizeStationName("Bordeaux Saint-Jean (Bordeaux)")
    );
    expect(normalizeStationName("La Défense")).toBe("la defense");
  });

  it("normalizes diverse apostrophes and ligatures", () => {
    expect(normalizeStationName("Gare d'Austerlitz")).toBe("austerlitz");
    expect(normalizeStationName("Gare d’Austerlitz")).toBe("austerlitz");
    expect(normalizeStationName("Gare d‘Austerlitz")).toBe("austerlitz");
    expect(normalizeStationName("Gare d`Austerlitz")).toBe("austerlitz");
    expect(normalizeStationName("Gare de Cœur")).toBe("coeur");
    expect(normalizeStationName("Gare d’ædicule")).toBe("aedicule");
  });
});

describe("isSameStation", () => {
  it("returns true for same station name within max radius", () => {
    const a = { name: "Paris Montparnasse", coords: { lat: 48.84, lng: 2.32 } };
    const b = { name: "Paris Montparnasse (Hall 1 & 2)", coords: { lat: 48.841, lng: 2.321 } };
    expect(isSameStation(a, b)).toBe(true);
  });

  it("returns false for identical station names when far apart", () => {
    const a = { name: "Gare Centrale", coords: { lat: 48.85, lng: 2.35 } }; // Paris
    const b = { name: "Gare Centrale", coords: { lat: 45.75, lng: 4.85 } }; // Lyon (~400km)
    expect(isSameStation(a, b)).toBe(false);
  });

  it("returns true for different names within 150m radius", () => {
    const a = { name: "Arrêt Métro A", coords: { lat: 48.8566, lng: 2.3522 } };
    const b = { name: "Arrêt Bus B", coords: { lat: 48.8568, lng: 2.3523 } }; // ~25m
    expect(isSameStation(a, b)).toBe(true);
  });

  it("returns false for different names beyond 150m radius", () => {
    const a = { name: "Gare de Lyon", coords: { lat: 48.8443, lng: 2.3744 } };
    const b = { name: "Gare d'Austerlitz", coords: { lat: 48.8422, lng: 2.3653 } }; // ~700m
    expect(isSameStation(a, b)).toBe(false);
  });
});

describe("mergeSegments", () => {
  it("collapses repeated same-station hops", () => {
    const out = mergeSegments([
      seg("Saint-Germain-en-Laye", "Saint-Germain-en-Laye (Saint-Germain-en-Laye)", "walking", { km: 0.1 }),
      seg("Saint-Germain-en-Laye (Saint-Germain-en-Laye)", "Saint-Germain-en-Laye [Saint-Germain-en-Laye]", "train", { label: "RER A", km: 0 }),
      seg("Saint-Germain-en-Laye [Saint-Germain-en-Laye]", "La Défense (Puteaux)", "train", { label: "RER A", km: 15 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].to.name).toBe("La Défense (Puteaux)");
    expect(out[0].distanceKm).toBe(15);
  });

  it("merges consecutive legs on the same line", () => {
    const out = mergeSegments([
      seg("A station", "B station", "train", { label: "TGV 1", km: 100, fromLat: 45, toLat: 46 }),
      seg("B station", "C station", "train", { label: "TGV 1", km: 50, fromLat: 46, toLat: 47 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].distanceKm).toBe(150);
    expect(out[0].durationMinutes).toBe(20);
    expect(out[0].coordinates).toHaveLength(3);
    expect(out[0].from.name).toBe("A station");
    expect(out[0].to.name).toBe("C station");
  });

  it("keeps different lines separate", () => {
    const out = mergeSegments([
      seg("A station", "B station", "train", { label: "RER A", km: 10, fromLat: 45, toLat: 46 }),
      seg("B station", "C station", "train", { label: "Metro 14", km: 5, fromLat: 46, toLat: 47 }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("drops an in-station walking transfer between two trains", () => {
    const out = mergeSegments([
      seg("Paris - Montparnasse - Hall 1 & 2 (Paris)", "Bordeaux Saint-Jean", "train", { label: "TGV 8", km: 500, fromLat: 48.84, toLat: 44.82 }),
    ]);
    expect(out).toHaveLength(1);
    const withTransfer = mergeSegments([
      seg("X", "Paris - Montparnasse (Paris)", "train", { label: "Metro 14", km: 5, fromLat: 48.9, toLat: 48.84 }),
      seg("Paris - Montparnasse (Paris)", "Paris - Montparnasse - Hall 1 & 2 (Paris)", "walking", { km: 0.2, fromLat: 48.84, toLat: 48.84 }),
      seg("Paris - Montparnasse - Hall 1 & 2 (Paris)", "Bordeaux", "train", { label: "TGV 8", km: 500, fromLat: 48.84, toLat: 44.8 }),
    ]);
    expect(withTransfer.map((s) => s.mode)).toEqual(["train", "train"]);
  });

  it("never returns an empty route", () => {
    const out = mergeSegments([seg("Same", "Same", "walking", { km: 0 })]);
    expect(out).toHaveLength(1);
  });

  it("leaves a simple route unchanged", () => {
    const input = [
      seg("Home", "Gare A", "walking", { km: 1, fromLat: 45, toLat: 45.1 }),
      seg("Gare A", "Gare B", "train", { label: "TER", km: 100, fromLat: 45.1, toLat: 46 }),
    ];
    expect(mergeSegments(input)).toHaveLength(2);
  });
});

describe("countTransports", () => {
  it("does not count walking and derives transfers", () => {
    const c = countTransports([
      seg("Home", "Gare A", "walking"),
      seg("Gare A", "Gare B", "train", { label: "RER A" }),
      seg("Gare B", "Gare C", "train", { label: "TGV" }),
      seg("Gare C", "Dest", "walking"),
    ]);
    expect(c.total).toBe(2);
    expect(c.byMode).toEqual({ train: 2 });
    expect(countTransfers(c)).toBe(1);
  });

  it("counts a direct car trip as one", () => {
    const c = countTransports([seg("A", "B", "car")]);
    expect(c.total).toBe(1);
    expect(countTransfers(c)).toBe(0);
  });

  it("does not count a car access leg", () => {
    const c = countTransports([seg("A", "Gare", "car"), seg("Gare", "B", "train", { label: "TGV" })]);
    expect(c.total).toBe(1);
  });
});

