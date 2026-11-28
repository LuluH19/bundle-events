import { describe, expect, it, vi } from "vitest";
import type { Venue } from "@/src/types";
import { isInCity } from "@/src/utils/algorithms/venue-dedupe";
import { interleave } from "@/src/services/event-search";

// event-search goes through the server-only API cache.
vi.mock("server-only", () => ({}));

const venue = (city: string): Venue => ({ id: "x", name: "Lille Grand Palais", address: "", coords: { lat: 0, lng: 0 }, city });

describe("isInCity", () => {
  it("garde les lieux de la ville choisie, accents et casse compris", () => {
    expect(isInCity(venue("Lille"), "lille")).toBe(true);
    expect(isInCity(venue("Paris 11e Arrondissement"), "Paris")).toBe(true);
    expect(isInCity(venue("Évry"), "evry")).toBe(true);
  });

  it("écarte un lieu dont seul le nom contient la ville", () => {
    expect(isInCity(venue("Paris"), "Lille")).toBe(false);
    expect(isInCity(venue("Villeneuve-d'Ascq"), "Lille")).toBe(false);
  });
});

describe("interleave", () => {
  it("alterne les villes pour que chacune soit représentée", () => {
    expect(interleave([["p1", "p2", "p3"], ["l1"], ["m1", "m2"]], 5)).toEqual(["p1", "l1", "m1", "p2", "m2"]);
    expect(interleave([[], ["a"]], 8)).toEqual(["a"]);
  });
});
