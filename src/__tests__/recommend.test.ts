import { describe, it, expect } from "vitest";
import type { HotelMapItem, RouteOption, TransportMode } from "@/src/types";
import { pickOption, pickHotel, optionBadges, optionCo2Kg } from "@/src/utils/algorithms/recommend";

function option(id: string, mode: TransportMode, durationMin: number, price: number, km = 500): RouteOption {
  return {
    id,
    mode,
    durationMin,
    price,
    distanceKm: km,
    route: {
      segments: [
        {
          from: { name: "A", coords: { lat: 48, lng: 2 } },
          to: { name: "B", coords: { lat: 45, lng: 4 } },
          mode,
          coordinates: [],
          distanceKm: km,
          durationMinutes: durationMin,
        },
      ],
      totalDistanceKm: km,
      totalDurationMinutes: durationMin,
      isMultimodal: false,
    },
  };
}

const VENUE = { lat: 44.86, lng: -0.52 };

function hotel(id: string, kmNorth: number, price: number | undefined, rating?: number): HotelMapItem {
  return {
    id,
    name: id,
    locationName: "Bordeaux",
    coords: { lat: VENUE.lat + kmNorth / 111, lng: VENUE.lng },
    pricePerNight: price,
    rating,
  };
}

describe("pickOption", () => {
  const options = [
    option("train", "train", 270, 79),
    option("bus", "bus", 520, 29),
    option("plane", "plane", 200, 140),
  ];

  it("returns the fastest option by default", () => {
    expect(pickOption(options, "fast")?.id).toBe("plane");
  });

  it("returns the cheapest option", () => {
    expect(pickOption(options, "cheap")?.id).toBe("bus");
  });

  it("returns the lowest CO2 option", () => {
    expect(pickOption(options, "green")?.id).toBe("train");
  });

  it("returns null without options", () => {
    expect(pickOption([], "fast")).toBeNull();
  });

  it("labels each winner once per preference", () => {
    expect(optionBadges(options)).toEqual({ plane: ["fast"], bus: ["cheap"], train: ["green"] });
  });

  it("computes CO2 from segment distances", () => {
    expect(optionCo2Kg(option("t", "train", 60, 10, 100))).toBeCloseTo(0.3);
  });
});

describe("pickHotel", () => {
  const hotels = [
    hotel("far-cheap", 8, 40, 7),
    hotel("walk-good", 1, 95, 9),
    hotel("walk-cheap", 1.2, 70, 7.5),
    hotel("walk-closest", 0.3, 120, 6),
  ];

  it("prefers the best rated hotel within walking distance", () => {
    expect(pickHotel(hotels, VENUE, "fast")?.id).toBe("walk-good");
  });

  it("prefers the cheapest walkable hotel", () => {
    expect(pickHotel(hotels, VENUE, "cheap")?.id).toBe("walk-cheap");
  });

  it("prefers the closest hotel for the green preference", () => {
    expect(pickHotel(hotels, VENUE, "green")?.id).toBe("walk-closest");
  });

  it("falls back to farther hotels when none is walkable", () => {
    expect(pickHotel([hotel("a", 12, 60, 8), hotel("b", 20, 50, 9)], VENUE, "fast")?.id).toBe("b");
  });

  it("ignores hotels without a price when priced ones exist", () => {
    expect(pickHotel([hotel("no-price", 0.2, undefined, 10), hotel("priced", 0.5, 80, 7)], VENUE, "fast")?.id).toBe("priced");
  });

  it("returns null without hotels", () => {
    expect(pickHotel([], VENUE, "fast")).toBeNull();
  });
});
