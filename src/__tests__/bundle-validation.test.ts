import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/posthog-logs", () => ({ logBundleCreated: vi.fn(), flushPostHogLogs: vi.fn() }));

const { db } = vi.hoisted(() => ({
  db: { insert: vi.fn(), update: vi.fn(), usage: 1 as number },
}));
vi.mock("@/src/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    rpc: () => ({ abortSignal: async () => ({ data: db.usage, error: null }) }),
    from: () => ({
      insert: (row: unknown) => {
        db.insert(row);
        return { select: () => ({ single: async () => ({ data: { uuid: UUID }, error: null }) }) };
      },
      update: (row: unknown) => {
        db.update(row);
        return { eq: () => ({ select: async () => ({ data: [{ uuid: UUID }], error: null }) }) };
      },
    }),
  }),
}));

import { bundlesConfig } from "@/src/config";
import { validateBundleData } from "@/src/utils/bundle-validation";
import { resetRateLimits } from "@/src/lib/rate-limit";
import { POST as createBundle } from "@/src/app/api/bundles/route";
import { PATCH as patchBundle } from "@/src/app/api/bundles/[uuid]/route";
import type { BundleSnapshot, RouteOption } from "@/src/types";

const UUID = "3f2b8c1e-4d5a-4b6c-9e8f-0a1b2c3d4e5f";
const ctx = { params: Promise.resolve({ uuid: UUID }) };

const option: RouteOption = {
  id: "train-1",
  mode: "train",
  durationMin: 200,
  distanceKm: 775,
  price: 59,
  quote: { amount: 59, source: "live", provider: "sncf" },
  route: {
    segments: [
      {
        from: { name: "Paris Gare de Lyon", coords: { lat: 48.84, lng: 2.37 } },
        to: { name: "Marseille Saint-Charles", coords: { lat: 43.3, lng: 5.38 } },
        mode: "train",
        coordinates: [
          [48.84, 2.37],
          [43.3, 5.38],
        ],
        distanceKm: 775,
        durationMinutes: 200,
        departureTime: "2026-12-01T08:00",
      },
    ],
    totalDistanceKm: 775,
    totalDurationMinutes: 200,
    isMultimodal: false,
  },
};

const snapshot: BundleSnapshot = {
  departure: { id: "dep-1", name: "Paris", coords: { lat: 48.85, lng: 2.35 }, type: "departure", address: "Paris" },
  venue: { id: "poi-1", name: "Orange Vélodrome", coords: { lat: 43.27, lng: 5.4 }, type: "venue" },
  checkin: "2026-12-01",
  checkout: "2026-12-02",
  roundTrip: true,
  outboundOption: option,
  returnOption: null,
  selectedHotel: {
    id: "h1",
    name: "Hôtel du Port",
    locationName: "Marseille",
    coords: { lat: 43.29, lng: 5.37 },
    pricePerNight: 80,
    source: "liteapi",
  },
  preference: "cheap",
  arriveBy: "",
  leaveAfter: "18:00",
  booked: { outbound: true },
};

const post = (body: string, headers: Record<string, string> = {}) =>
  createBundle(new NextRequest("http://localhost/api/bundles", { method: "POST", body, headers }));
const patch = (body: string) =>
  patchBundle(new NextRequest(`http://localhost/api/bundles/${UUID}`, { method: "PATCH", body }), ctx);

describe("validateBundleData", () => {
  it("accepts a full snapshot", () => {
    expect(validateBundleData(snapshot)).toEqual({ ok: true, data: snapshot });
  });

  it("accepts a long car route with full geometry", () => {
    const coordinates = Array.from({ length: 13_000 }, (_, i): [number, number] => [48.85 - i / 3000, 2.35 + i / 4000]);
    const car = { ...option, mode: "car" as const, route: { ...option.route, segments: [{ ...option.route.segments[0], mode: "car" as const, coordinates }] } };
    const data = { ...snapshot, outboundOption: car, returnOption: car };
    expect(new TextEncoder().encode(JSON.stringify({ data })).length).toBeLessThan(bundlesConfig.maxBodyBytes);
    expect(validateBundleData(data).ok).toBe(true);
  });

  it("accepts a partial snapshot and extra keys on API-built objects", () => {
    expect(validateBundleData({ checkin: "2026-12-01" }).ok).toBe(true);
    expect(validateBundleData({ outboundOption: { ...option, trainNumber: "6101" } }).ok).toBe(true);
  });

  it.each([
    ["an unknown top-level key", { ...snapshot, admin: true }],
    ["a wrong type", { ...snapshot, roundTrip: "yes" }],
    ["an unknown preference", { ...snapshot, preference: "luxury" }],
    ["an unknown key on a location", { ...snapshot, venue: { ...snapshot.venue, html: "<b>" } }],
    ["a malformed point", { ...snapshot, outboundOption: { ...option, route: { ...option.route, segments: [{ ...option.route.segments[0], coordinates: [[1, "2"]] }] } } }],
    ["a string that is too long", { ...snapshot, checkin: "x".repeat(41) }],
    ["an over-long extra string", { ...snapshot, outboundOption: { ...option, note: "x".repeat(bundlesConfig.maxStringLength + 1) } }],
    ["an array", []],
    ["null", null],
  ])("rejects %s", (_label, data) => {
    expect(validateBundleData(data).ok).toBe(false);
  });
});

describe("bundles API limits", () => {
  beforeEach(() => {
    resetRateLimits();
    db.insert.mockClear();
    db.update.mockClear();
    db.usage = 1;
  });

  it("creates a valid bundle", async () => {
    const res = await post(JSON.stringify({ data: snapshot }));
    expect(res.status).toBe(201);
    expect(db.insert).toHaveBeenCalledWith({ data: snapshot });
  });

  it("answers 400 and writes nothing for invalid data", async () => {
    expect((await post(JSON.stringify({ data: { roundTrip: 1 } }))).status).toBe(400);
    expect((await patch(JSON.stringify({ data: { evil: "x" } }))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("answers 413 for an oversized body", async () => {
    const big = JSON.stringify({ data: { checkin: "x".repeat(bundlesConfig.maxBodyBytes) } });
    expect((await post(big)).status).toBe(413);
    expect((await patch(big)).status).toBe(413);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("limits creations per client", async () => {
    const body = JSON.stringify({ data: { checkin: "2026-12-01" } });
    const headers = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < bundlesConfig.createPerIp.max; i++) {
      expect((await post(body, headers)).status).toBe(201);
    }
    expect((await post(body, headers)).status).toBe(429);
    expect((await post(body, { "x-forwarded-for": "198.51.100.2" })).status).toBe(201);
  });

  it("stops creations past the daily total", async () => {
    db.usage = bundlesConfig.dailyCreateLimit + 1;
    expect((await post(JSON.stringify({ data: { checkin: "2026-12-01" } }))).status).toBe(429);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("still saves the autosave PATCH", async () => {
    expect((await patch(JSON.stringify({ data: snapshot }))).status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({ data: snapshot });
  });
});
