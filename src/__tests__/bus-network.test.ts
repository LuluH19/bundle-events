import { describe, expect, it } from "vitest";
import {
  activeWeekdayMasks,
  buildFeedLinks,
  mergeNetwork,
  parseCsv,
  readTable,
} from "../../scripts/lib/bus-network.mjs";

const bbox = { minLat: 41.2, maxLat: 51.2, minLng: -5.5, maxLng: 9.8 };

describe("parseCsv", () => {
  it("gère les guillemets, les virgules et les fins de ligne Windows", () => {
    expect(parseCsv('a,b\r\n"Paris, Bercy","dit ""ok"""\r\n')).toEqual([
      ["a", "b"],
      ["Paris, Bercy", 'dit "ok"'],
    ]);
  });
});

describe("activeWeekdayMasks", () => {
  it("combine calendar et calendar_dates sur la fenêtre", () => {
    const calendar = readTable(
      "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS1,1,0,0,0,0,0,0,20261101,20261231\n"
    );
    const dates = readTable("service_id,date,exception_type\nS2,20261121,1\nS1,20261116,2\n");
    const masks = activeWeekdayMasks(calendar, dates, new Date(Date.UTC(2026, 10, 15)), 7);
    expect(masks.get("S1")).toBeUndefined();
    expect(masks.get("S2")).toBe(1 << 5);
  });
});

describe("buildFeedLinks + mergeNetwork", () => {
  it("relie les arrêts français d'un même trajet en respectant montée et descente", () => {
    const stops = readTable(
      [
        "stop_id,stop_name,stop_lat,stop_lon,stop_timezone",
        "A,Rennes,48.10,-1.67,Europe/Paris",
        "B,Nantes,47.21,-1.54,Europe/Paris",
        "C,Bordeaux,44.83,-0.55,Europe/Paris",
        "G,Genève,46.20,6.14,Europe/Zurich",
      ].join("\n")
    );
    const trips = readTable("trip_id,service_id\nT1,S1\nT2,OFF\n");
    const stopTimes = readTable(
      [
        "trip_id,stop_id,stop_sequence,arrival_time,departure_time,pickup_type,drop_off_type",
        "T1,A,1,08:00:00,08:00:00,0,1",
        "T1,B,2,09:30:00,09:40:00,0,0",
        "T1,C,3,13:00:00,13:00:00,1,0",
        "T1,G,4,20:00:00,20:00:00,0,0",
        "T2,A,1,10:00:00,10:00:00,0,0",
        "T2,C,2,15:00:00,15:00:00,0,0",
      ].join("\n")
    );
    const feed = buildFeedLinks({
      operator: "FlixBus",
      stops,
      trips,
      stopTimes,
      masks: new Map([["S1", 1]]),
      bbox,
      timezone: "Europe/Paris",
    });
    expect([...feed.links.keys()].sort()).toEqual(["A|B", "A|C", "B|C"]);

    const network = mergeNetwork([feed], { validTo: "2027-01-01" });
    expect(network.operators).toEqual(["FlixBus"]);
    expect(network.stops.map((s: unknown[]) => s[0])).toEqual(["Rennes", "Nantes", "Bordeaux"]);
    expect(network.links["0-2"]).toEqual([[480, 300, 1]]);
    expect(network.links["1-2"]).toEqual([[580, 200, 1]]);
  });
});
