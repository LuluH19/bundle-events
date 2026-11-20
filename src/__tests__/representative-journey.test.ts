import { describe, expect, it } from "vitest";
import { geometrySearchDatetime, representativeJourneyIndex } from "@/src/utils/algorithms/representative-journey";

describe("representativeJourneyIndex", () => {
  it("préfère le trajet direct au détour par Paris", () => {
    const journeys = [
      { nb_transfers: 5, duration: 6 * 3600 },
      { nb_transfers: 0, duration: 4 * 3600 },
      { nb_transfers: 1, duration: 3.5 * 3600 },
    ];
    expect(representativeJourneyIndex(journeys)).toBe(1);
  });

  it("départage par la durée à nombre de changements égal", () => {
    expect(representativeJourneyIndex([{ nb_transfers: 1, duration: 300 }, { nb_transfers: 1, duration: 200 }])).toBe(1);
  });

  it("renvoie -1 sans trajet", () => {
    expect(representativeJourneyIndex([])).toBe(-1);
    expect(representativeJourneyIndex(undefined)).toBe(-1);
  });
});

describe("geometrySearchDatetime", () => {
  it("cherche le lendemain à 8 h", () => {
    expect(geometrySearchDatetime(new Date(2026, 11, 31, 22, 15))).toBe("20270101T080000");
  });
});
