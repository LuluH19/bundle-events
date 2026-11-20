import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { HotelMapItem } from "@/src/types";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/posthog-logs", () => ({ logApiDegraded: vi.fn() }));
vi.mock("@/src/lib/supabase/server", () => ({
  getSupabaseAdmin: () => {
    throw new Error("not configured");
  },
}));

const { liteapiSearch, overpassSearch } = vi.hoisted(() => ({ liteapiSearch: vi.fn(), overpassSearch: vi.fn() }));
vi.mock("@/src/adapters/hotels", () => ({
  LiteApiHotelAdapter: class {
    searchHotels = (...args: unknown[]) => liteapiSearch(...args);
  },
  OverpassHotelAdapter: class {
    searchHotels = (...args: unknown[]) => overpassSearch(...args);
  },
}));

import { GET } from "@/src/app/api/hotels/search/route";
import { resetApiCache } from "@/src/lib/api-cache";

const hotel = (id: string, price?: number): HotelMapItem => ({
  id,
  name: `Hotel ${id}`,
  locationName: "",
  coords: { lat: 48.89, lng: 2.39 },
  pricePerNight: price,
  currency: price ? "EUR" : undefined,
});

function search(checkin: string, checkout: string) {
  const url = `http://localhost/api/hotels/search?lat=48.8924&lng=2.3933&radius=50&checkin=${checkin}&checkout=${checkout}`;
  return GET(new NextRequest(url));
}

describe("/api/hotels/search fallback chain", () => {
  beforeEach(() => {
    resetApiCache();
    liteapiSearch.mockReset();
    overpassSearch.mockReset();
  });

  it("returns LiteAPI hotels sorted by price", async () => {
    liteapiSearch.mockResolvedValue([hotel("b", 120), hotel("a", 80)]);
    const res = await search("2026-12-10", "2026-12-11");
    expect(res.headers.get("X-Data-Source")).toBe("liteapi");
    expect((await res.json()).map((h: HotelMapItem) => h.id)).toEqual(["a", "b"]);
  });

  it("falls back to hotels seen around the venue for other dates, without prices", async () => {
    liteapiSearch.mockResolvedValueOnce([hotel("a", 80)]);
    await search("2026-12-10", "2026-12-11");

    liteapiSearch.mockRejectedValue(new Error("LiteAPI 429"));
    const res = await search("2027-01-05", "2027-01-06");
    expect(res.headers.get("X-Data-Source")).toBe("liteapi-venue");
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].pricePerNight).toBeUndefined();
    expect(overpassSearch).not.toHaveBeenCalled();
  });

  it("falls back to OpenStreetMap when LiteAPI never answered for this venue", async () => {
    liteapiSearch.mockRejectedValue(new Error("LiteAPI 500"));
    overpassSearch.mockResolvedValue([hotel("osm-1")]);
    const res = await search("2026-12-10", "2026-12-11");
    expect(res.headers.get("X-Data-Source")).toBe("overpass");
    expect(overpassSearch).toHaveBeenCalledWith(expect.objectContaining({ radiusKm: "5" }));
  });

  it("returns an empty list when every source fails", async () => {
    liteapiSearch.mockRejectedValue(new Error("down"));
    overpassSearch.mockRejectedValue(new Error("down"));
    const res = await search("2026-12-10", "2026-12-11");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("none");
    expect(await res.json()).toEqual([]);
  });
});
