import { describe, it, expect } from "vitest";
import type { RouteOption, RouteSegment, TransportMode } from "@/src/types";
import { changePoints, modeSummary, stayNights, transferCount, transferLabel, tripTotal } from "@/src/utils/trip";

function seg(mode: TransportMode, from: string, to: string): RouteSegment {
  return {
    from: { name: from, coords: { lat: 0, lng: 0 } },
    to: { name: to, coords: { lat: 0, lng: 0 } },
    mode,
    coordinates: [],
    distanceKm: 10,
    durationMinutes: 10,
  };
}

function opt(segments: RouteSegment[], price = 50): RouteOption {
  return {
    id: "o",
    mode: "train",
    durationMin: 100,
    distanceKm: 100,
    price,
    route: { segments, totalDistanceKm: 100, totalDurationMinutes: 100, isMultimodal: true },
  };
}

const viaParis = opt([
  seg("walking", "Domicile", "Rennes"),
  seg("train", "Rennes", "Paris Montparnasse"),
  seg("train", "Paris Montparnasse", "Bordeaux"),
  seg("bus", "Bordeaux", "Arkéa Arena"),
]);

describe("trip helpers", () => {
  it("counts transfers between vehicles only", () => {
    expect(transferCount(viaParis)).toBe(2);
    expect(transferLabel(viaParis)).toBe("2 changements");
  });

  it("lists the stations where you change", () => {
    expect(changePoints(viaParis)).toEqual(["Paris Montparnasse", "Bordeaux"]);
  });

  it("summarises the modes", () => {
    expect(modeSummary(viaParis)).toBe("2 Trains + Bus");
  });

  it("labels a direct trip", () => {
    expect(transferLabel(opt([seg("train", "A", "B")]))).toBe("Direct");
  });

  it("counts nights with a one-night minimum", () => {
    expect(stayNights("2026-12-12", "2026-12-14")).toBe(2);
    expect(stayNights("2026-12-12", "2026-12-12")).toBe(1);
  });

  it("adds outbound, hotel nights and return", () => {
    const hotel = { id: "h", name: "H", locationName: "", coords: { lat: 0, lng: 0 }, pricePerNight: 89 };
    expect(tripTotal({ outbound: opt([], 79), ret: opt([], 74), hotel, nights: 2, roundTrip: true, withHotel: true }).total).toBe(331);
    expect(tripTotal({ outbound: opt([], 79), ret: opt([], 74), hotel, nights: 1, roundTrip: true, withHotel: false }).total).toBe(153);
    expect(tripTotal({ outbound: opt([], 79), ret: opt([], 74), hotel, nights: 1, roundTrip: false, withHotel: true }).total).toBe(168);
  });
});
