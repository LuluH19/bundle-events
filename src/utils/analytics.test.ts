import { describe, expect, it } from "vitest";
import { venueProvider } from "./analytics";

describe("venueProvider", () => {
  it("maps adapter id prefixes to providers", () => {
    expect(venueProvider("tm-G5vYZ9")).toBe("ticketmaster");
    expect(venueProvider("poi-dXJuOm1ieHA")).toBe("mapbox");
    expect(venueProvider("osm-node123")).toBe("osm");
  });

  it("falls back to opendata for unprefixed ids", () => {
    expect(venueProvider("81295035")).toBe("opendata");
  });
});
