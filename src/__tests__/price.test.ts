import { describe, it, expect } from "vitest";
import type { PriceQuote, RouteOption, RouteSegment, TransportMode } from "@/src/types";
import {
  aggregateModeQuotes,
  bookableSpans,
  carCost,
  combineQuotes,
  isLongDistanceTicket,
  mainSpan,
  spanDepartureTime,
  ticketedSpans,
  withQuote,
} from "@/src/utils/algorithms/price";
import { parseTrainlineQuote, type TrainlineSearchResponse } from "@/src/adapters/prices/trainline.adapter";
import { parseFlixbusQuote, type FlixbusSearchResponse } from "@/src/adapters/prices/flixbus.adapter";
import { parseTariffRecords } from "@/src/adapters/prices/sncf-tariffs.adapter";
import { tripTotal } from "@/src/utils/trip";
import { pricesConfig } from "@/src/config/prices";

function seg(mode: TransportMode, from: string, to: string, km = 10, label?: string): RouteSegment {
  return {
    from: { name: from, coords: { lat: 0, lng: 0 } },
    to: { name: to, coords: { lat: 1, lng: 1 } },
    mode,
    coordinates: [],
    distanceKm: km,
    durationMinutes: 10,
    label,
  };
}

function opt(mode: TransportMode, segments: RouteSegment[], price = 50): RouteOption {
  const distanceKm = segments.reduce((s, x) => s + x.distanceKm, 0);
  return {
    id: mode,
    mode,
    durationMin: 120,
    distanceKm,
    price,
    route: { segments, totalDistanceKm: distanceKm, totalDurationMinutes: 120, isMultimodal: segments.length > 1 },
  };
}

describe("bookableSpans / mainSpan", () => {
  it("prices the longest train segment — same OD as the Trainline button", () => {
    const o = opt("train", [
      seg("walking", "Mont-Saint-Michel", "Pontorson", 8),
      seg("train", "Pontorson", "Rennes", 50),
      seg("train", "Rennes", "Paris Montparnasse", 350),
      seg("train", "Paris Montparnasse", "Venue", 12),
    ]);
    const spans = bookableSpans(o);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({
      mode: "train",
      from: { name: "Rennes" },
      to: { name: "Paris Montparnasse" },
    });
    expect(mainSpan(o)?.from.name).toBe("Rennes");
  });

  it("quotes one plane leg and the longest train leg on multimodal options", () => {
    const o = opt("plane", [
      seg("train", "Vercelli", "Airport", 80),
      seg("plane", "Airport", "Nice Apt", 300),
      seg("train", "Nice Apt", "Nice Ville", 20),
    ]);
    const spans = bookableSpans(o);
    expect(spans.map((s) => s.mode).sort()).toEqual(["plane", "train"]);
    expect(spans.find((s) => s.mode === "train")).toMatchObject({
      from: { name: "Vercelli" },
      to: { name: "Airport" },
    });
    expect(ticketedSpans(o)).toHaveLength(3);
  });

  it("skips Orly→Paris airport shuttles for Trainline on plane options", () => {
    const shuttle = seg("train", "Aéroport Paris Orly", "Paris", 25);
    const feeder = seg("train", "City", "Airport", 90);
    const o = opt("plane", [shuttle, seg("plane", "ORY", "NCE", 700), seg("train", "Nice Apt", "Nice", 15)]);
    expect(isLongDistanceTicket(o, "train", shuttle)).toBe(false);
    expect(isLongDistanceTicket(o, "train", feeder)).toBe(true);
    expect(bookableSpans(o).map((s) => s.mode)).toEqual(["plane"]);
  });

  it("returns null for pure car / walking options", () => {
    expect(mainSpan(opt("car", [seg("car", "A", "B", 200)]))).toBeNull();
    expect(mainSpan(opt("walking", [seg("walking", "A", "B", 1)]))).toBeNull();
  });
});

describe("combineQuotes", () => {
  const fuel = 1.8;

  it("adds estimated access cost to a live ticket price", () => {
    const o = opt("train", [
      seg("car", "Home", "Station", 40),
      seg("train", "Station", "Dest", 500),
      seg("walking", "Dest", "Venue", 1),
    ]);
    const quote = combineQuotes(o, { amount: 79, source: "live", provider: "Trainline" }, fuel);
    const access = Math.round(carCost(40, fuel));
    expect(quote.source).toBe("live");
    expect(quote.provider).toBe("Trainline");
    expect(quote.amount).toBe(79 + access);
    expect(quote.extras).toBe(access);
  });

  it("falls back to a local estimate when no provider answered", () => {
    const o = opt("bus", [seg("bus", "A", "B", 200)]);
    const quote = combineQuotes(o, null, fuel);
    expect(quote.source).toBe("estimate");
    expect(quote.amount).toBeGreaterThan(0);
  });

  it("prices a car trip from fuel + tolls", () => {
    const o = opt("car", [seg("car", "A", "B", 300)]);
    const quote = combineQuotes(o, null, fuel);
    expect(quote.source).toBe("estimate");
    expect(quote.provider).toBe("carburant + péages");
    expect(quote.amount).toBe(Math.round(carCost(300, fuel)));
  });

  it("keeps walking free and live", () => {
    expect(combineQuotes(opt("walking", [seg("walking", "A", "B", 2)]), null, fuel)).toEqual({
      amount: 0,
      source: "live",
    });
  });

  it("preserves tariff max and bumps it with extras", () => {
    const o = opt("train", [seg("car", "Home", "Gare", 60), seg("train", "Gare", "Dest", 400)]);
    const quote = combineQuotes(o, { amount: 29, max: 119, source: "tariff", provider: "SNCF" }, fuel);
    const access = Math.round(carCost(60, fuel));
    expect(quote.amount).toBe(29 + access);
    expect(quote.max).toBe(119 + access);
    expect(quote.source).toBe("tariff");
  });

  it("sums the bookable plane + longest train fares (feeder trains ignored)", () => {
    const o = opt("plane", [
      seg("train", "Vercelli", "MXP", 80),
      seg("plane", "MXP", "NCE", 300),
      seg("train", "NCE", "Nice", 15),
    ]);
    // bookableSpans order follows TICKETED: plane, train, bus → plane first, then longest train
    const spans = bookableSpans(o);
    const quote = combineQuotes(
      o,
      spans.map((s) =>
        s.mode === "plane"
          ? { amount: 90, source: "live" as const, provider: "Aviasales" }
          : { amount: 12, source: "live" as const, provider: "Trainline" }
      ),
      fuel
    );
    expect(quote).toMatchObject({
      amount: 102,
      source: "live",
      provider: "Aviasales + Trainline",
    });
  });

  it("marks the whole quote as estimate when one span stays estimated", () => {
    const o = opt("plane", [seg("train", "A", "B", 120), seg("plane", "B", "C", 400)]);
    const spans = bookableSpans(o);
    const quote = combineQuotes(
      o,
      spans.map((s) => (s.mode === "train" ? { amount: 15, source: "live" as const, provider: "Trainline" } : null)),
      fuel
    );
    expect(quote.source).toBe("estimate");
    expect(quote.provider).toContain("Trainline");
    expect(quote.amount).toBeGreaterThan(15);
  });

  it("aggregates fares per bookable mode for booking buttons", () => {
    const o = opt("plane", [
      seg("train", "A", "Apt", 120),
      seg("plane", "Apt", "Dest", 300),
      seg("train", "Dest", "Venue", 15),
    ]);
    const spans = bookableSpans(o);
    const byMode = aggregateModeQuotes(
      o,
      spans.map((s) =>
        s.mode === "plane"
          ? { amount: 80, source: "live" as const, provider: "Aviasales" }
          : { amount: 12, source: "live" as const, provider: "Trainline" }
      )
    );
    expect(byMode.train?.amount).toBe(12);
    expect(byMode.plane?.amount).toBe(80);
  });
});

describe("withQuote / spanDepartureTime", () => {
  it("replaces option.price with the quote amount", () => {
    const o = opt("train", [seg("train", "A", "B", 100)], 99);
    const quoted = withQuote(o, { amount: 45, source: "live", provider: "Trainline" });
    expect(quoted.price).toBe(45);
    expect(quoted.quote?.provider).toBe("Trainline");
  });

  it("steps back by duration for arrive-by searches", () => {
    expect(spanDepartureTime("2026-12-12T18:00", "arrival", 120)).toBe("2026-12-12T16:00");
    expect(spanDepartureTime("2026-12-12T08:00", "departure", 120)).toBe("2026-12-12T08:00");
  });
});

describe("carCost", () => {
  it("adds fuel for every km and tolls only beyond the free distance", () => {
    const fuel = 2;
    const short = carCost(pricesConfig.tollFreeKm, fuel);
    const long = carCost(pricesConfig.tollFreeKm + 100, fuel);
    const extraFuel = (100 * pricesConfig.carConsumptionL100 * fuel) / 100;
    expect(long - short).toBeCloseTo(extraFuel + 100 * pricesConfig.tollPerKm, 5);
  });
});

describe("parseTrainlineQuote", () => {
  const body: TrainlineSearchResponse = {
    data: {
      journeySearch: {
        journeys: {
          j1: { departAt: "2026-12-12T08:00:00", sections: ["s1"] },
          j2: { departAt: "2026-12-12T12:00:00", sections: ["s2"] },
        },
        sections: {
          s1: { alternatives: ["a1"] },
          s2: { alternatives: ["a2"] },
        },
        alternatives: {
          a1: { price: { amount: 90 } },
          a2: { fullPrice: { amount: 55 } },
        },
      },
    },
  };

  it("picks the cheapest journey (Trainline « Le moins cher »)", () => {
    expect(parseTrainlineQuote(body, "2026-12-12T08:10")).toEqual({
      amount: 55,
      source: "live",
      provider: "Trainline",
    });
  });
});

describe("parseFlixbusQuote", () => {
  const body: FlixbusSearchResponse = {
    trips: [
      {
        results: {
          r1: { status: "available", departure: { date: "2026-12-12T09:00:00" }, price: { total: 19 } },
          r2: {
            status: "available",
            departure: { date: "2026-12-12T15:00:00" },
            price: { total: 12, total_with_platform_fee: 14.9 },
          },
          r3: { status: "sold_out", departure: { date: "2026-12-12T15:05:00" }, price: { total: 9 } },
        },
      },
    ],
  };

  it("uses the platform fee and the closest available ride", () => {
    expect(parseFlixbusQuote(body, "2026-12-12T14:50")).toEqual({
      amount: 15,
      source: "live",
      provider: "FlixBus",
    });
  });
});

describe("parseTariffRecords", () => {
  it("returns the min/max envelope across carriers", () => {
    expect(parseTariffRecords([{ min: 29, max: 99 }, { min: 35, max: 119 }])).toEqual({
      amount: 29,
      max: 119,
      source: "tariff",
      provider: "SNCF",
    });
  });

  it("returns null when no positive fare exists", () => {
    expect(parseTariffRecords([{ min: 0, max: 0 }])).toBeNull();
  });
});

describe("tripTotal.allLive", () => {
  const live = (price: number): RouteOption =>
    withQuote(opt("train", [seg("train", "A", "B", 100)], price), { amount: price, source: "live", provider: "Trainline" });
  const estimate = (price: number): RouteOption =>
    withQuote(opt("car", [seg("car", "A", "B", 100)], price), { amount: price, source: "estimate" });

  it("is true only when every transport leg has a live quote", () => {
    expect(tripTotal({ outbound: live(40), ret: live(45), hotel: null, nights: 1, roundTrip: true, withHotel: false }).allLive).toBe(true);
    expect(tripTotal({ outbound: live(40), ret: estimate(45), hotel: null, nights: 1, roundTrip: true, withHotel: false }).allLive).toBe(false);
    expect(tripTotal({ outbound: opt("train", [seg("train", "A", "B")], 40), ret: null, hotel: null, nights: 1, roundTrip: false, withHotel: false }).allLive).toBe(false);
  });
});
