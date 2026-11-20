import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/posthog-logs", () => ({
  logApiDegraded: vi.fn(),
  logBundleCreated: vi.fn(),
  logBundleLinkEmailRequested: vi.fn(),
  flushPostHogLogs: vi.fn(),
}));

const { db } = vi.hoisted(() => ({ db: { select: vi.fn(), updated: [] as unknown[] } }));
vi.mock("@/src/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const q = {
        select: (cols: string) => {
          db.select(cols);
          return q;
        },
        update: () => ({ eq: () => ({ select: async () => ({ data: db.updated, error: null }) }) }),
        eq: () => q,
        maybeSingle: async () => ({ data: { uuid: UUID, data: {} }, error: null }),
      };
      return q;
    },
  }),
}));

import { escapeHtml } from "@/src/utils/format";
import { isUuid } from "@/src/utils/uuid";
import { GET as getBundle, PATCH as patchBundle } from "@/src/app/api/bundles/[uuid]/route";
import { POST as saveBundle } from "@/src/app/api/bundles/[uuid]/save/route";
import { GET as searchHotels } from "@/src/app/api/hotels/search/route";

const UUID = "3f2b8c1e-4d5a-4b6c-9e8f-0a1b2c3d4e5f";
const ctx = (uuid: string) => ({ params: Promise.resolve({ uuid }) });
const req = (url: string, init?: { method: string; body: string }) => new NextRequest(`http://localhost${url}`, init);

describe("escapeHtml", () => {
  it("neutralises markup in names shown in map popups", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeHtml("Zénith & Co's")).toBe("Zénith &amp; Co&#39;s");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("isUuid", () => {
  it("accepts Postgres uuids only", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid(UUID.toUpperCase())).toBe(true);
    expect(isUuid("favicon.ico")).toBe(false);
    expect(isUuid(`${UUID}x`)).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("/api/bundles/[uuid]", () => {
  beforeEach(() => {
    db.select.mockReset();
    db.updated = [];
  });

  it("never selects the owner's email for the public read", async () => {
    const res = await getBundle(req(`/api/bundles/${UUID}`), ctx(UUID));
    expect(res.status).toBe(200);
    expect(db.select).toHaveBeenCalledWith(expect.not.stringContaining("email"));
  });

  it("answers 404 for a non-uuid id without querying the database", async () => {
    const res = await getBundle(req("/api/bundles/not-a-uuid"), ctx("not-a-uuid"));
    expect(res.status).toBe(404);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("answers 404 when PATCH matches no row", async () => {
    const body = JSON.stringify({ data: { checkin: "2026-12-01" } });
    const res = await patchBundle(req(`/api/bundles/${UUID}`, { method: "PATCH", body }), ctx(UUID));
    expect(res.status).toBe(404);
  });

  it("rejects an array as bundle data", async () => {
    const res = await patchBundle(req(`/api/bundles/${UUID}`, { method: "PATCH", body: '{"data":[]}' }), ctx(UUID));
    expect(res.status).toBe(400);
  });

  it("rejects a non-string email", async () => {
    const res = await saveBundle(req(`/api/bundles/${UUID}/save`, { method: "POST", body: '{"email":["a@b.co"]}' }), ctx(UUID));
    expect(res.status).toBe(400);
  });
});

describe("/api/hotels/search input validation", () => {
  it.each([
    "lat=abc&lng=2.39&checkin=2026-12-10&checkout=2026-12-11",
    "lat=95&lng=2.39&checkin=2026-12-10&checkout=2026-12-11",
    "lat=48.89&lng=2.39&checkin=tomorrow&checkout=2026-12-11",
  ])("rejects %s", async (qs) => {
    const res = await searchHotels(req(`/api/hotels/search?${qs}`));
    expect(res.status).toBe(400);
  });
});
