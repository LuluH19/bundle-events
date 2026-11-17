import { describe, expect, it } from "vitest";
import type { BusNetwork } from "@/src/types";
import { findBusConnection, weekdayIndex } from "@/src/utils/algorithms/bus-connection";

const RENNES = { lat: 48.1173, lng: -1.6778 };
const FLOIRAC = { lat: 44.8379, lng: -0.5264 };
const MONDAY_AND_FRIDAY = (1 << 0) | (1 << 4);
const SUNDAY = 1 << 6;

const network: BusNetwork = {
  generatedAt: "2026-11-15T00:00:00.000Z",
  validFrom: "2026-11-15",
  validTo: "2027-02-12",
  operators: ["FlixBus", "BlaBlaCar Bus"],
  stops: [
    ["Rennes (Central bus station)", 48.1039, -1.67062, 0],
    ["Bordeaux (Saint-Jean - Paludate)", 44.82975, -0.55393, 0],
    ["Rennes - Bus Station", 48.1041, -1.66991, 1],
    ["Bordeaux - Belcier Bus Stop", 44.82272, -0.55469, 1],
  ],
  links: {
    "0-1": [
      [395, 385, MONDAY_AND_FRIDAY],
      [825, 370, MONDAY_AND_FRIDAY],
    ],
    "2-3": [[480, 360, SUNDAY]],
  },
};

describe("weekdayIndex", () => {
  it("numérote les jours du lundi (0) au dimanche (6)", () => {
    expect(weekdayIndex("2026-11-16")).toBe(0);
    expect(weekdayIndex("2026-11-22")).toBe(6);
    expect(weekdayIndex("pas une date")).toBeNull();
  });
});

describe("findBusConnection", () => {
  it("choisit la liaison directe la plus rapide entre les arrêts proches", () => {
    const c = findBusConnection(network, RENNES, FLOIRAC);
    expect(c?.operator).toBe("BlaBlaCar Bus");
    expect(c?.durationMinutes).toBe(360);
    expect(c?.departures).toEqual([{ departure: "08:00", arrival: "14:00", durationMinutes: 360 }]);
  });

  it("ne garde que les départs qui circulent le jour demandé", () => {
    const c = findBusConnection(network, RENNES, FLOIRAC, "2026-11-16");
    expect(c?.operator).toBe("FlixBus");
    expect(c?.from.name).toBe("Rennes (Central bus station)");
    expect(c?.durationMinutes).toBe(370);
    expect(c?.departures.map((d) => d.departure)).toEqual(["06:35", "13:45"]);
  });

  it("renvoie null quand aucun car ne circule ce jour-là", () => {
    expect(findBusConnection(network, RENNES, FLOIRAC, "2026-11-17")).toBeNull();
  });

  it("renvoie null quand aucun arrêt n'est assez proche", () => {
    expect(findBusConnection(network, { lat: 43.6, lng: 3.88 }, FLOIRAC)).toBeNull();
  });
});
