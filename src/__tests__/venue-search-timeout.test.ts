import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";
  process.env.TICKETMASTER_API_KEY = "";
});
vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/posthog-logs", () => ({ logApiDegraded: vi.fn() }));
vi.mock("@/src/lib/supabase/server", () => ({
  getSupabaseAdmin: () => {
    throw new Error("not configured");
  },
}));

import { eventsConfig } from "@/src/config";
import { resetApiCache } from "@/src/lib/api-cache";
import { MapboxVenueAdapter, OsmVenueAdapter } from "@/src/adapters/events";
import { searchEventsAndVenues } from "@/src/services/event-search";

const timeoutError = () => new DOMException("The operation was aborted due to timeout", "TimeoutError");

/** A fetch that never answers on its own: it only settles when its signal aborts. */
function hangingFetch(_url: string, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return; // no timeout: hangs forever, which is the bug
    if (signal.aborted) return reject(signal.reason);
    signal.addEventListener("abort", () => reject(signal.reason));
  });
}

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

const nominatimStadium = [
  {
    osm_type: "way",
    osm_id: 1,
    category: "leisure",
    type: "stadium",
    name: "Stade Vélodrome",
    display_name: "Stade Vélodrome, Marseille",
    lat: "43.2698",
    lon: "5.3959",
    address: { city: "Marseille" },
  },
];

describe("venue search timeouts (issue #192)", () => {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    resetApiCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    // Expire immediately instead of waiting the real delay.
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => AbortSignal.abort(timeoutError()));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("gives both venue adapters a timeout", async () => {
    fetchMock.mockImplementation(hangingFetch);
    await expect(new MapboxVenueAdapter().searchEvents({ query: "velodrome" })).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await expect(new OsmVenueAdapter().searchEvents({ query: "velodrome" })).rejects.toMatchObject({
      name: "TimeoutError",
    });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(eventsConfig.venueTimeoutMs);
  });

  it("returns the other sources when Mapbox hangs, and does not cache the timeout", async () => {
    fetchMock.mockImplementation((url, init) => {
      if (url.includes("api.mapbox.com")) return hangingFetch(url, init);
      if (url.includes("nominatim")) return json(nominatimStadium);
      return json({ results: [] });
    });

    const first = await searchEventsAndVenues("velodrome");
    expect(first.venues.map((v) => v.name)).toEqual(["Stade Vélodrome"]);

    const mapboxCalls = () => fetchMock.mock.calls.filter(([url]) => url.includes("api.mapbox.com")).length;
    expect(mapboxCalls()).toBe(1);
    await searchEventsAndVenues("velodrome");
    // A cached empty list would skip Mapbox here.
    expect(mapboxCalls()).toBe(2);
  });
});
