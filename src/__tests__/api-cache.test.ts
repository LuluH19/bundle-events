import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/posthog-logs", () => ({ logApiDegraded: vi.fn() }));
// No Supabase in unit tests: the cache must work in memory only.
vi.mock("@/src/lib/supabase/server", () => ({
  getSupabaseAdmin: () => {
    throw new Error("not configured");
  },
}));

import { cached, resetApiCache, UpstreamUnavailableError } from "@/src/lib/api-cache";
import { logApiDegraded } from "@/src/lib/posthog-logs";

const MIN = 60_000;
const base = { provider: "sncf" as const, key: "k", ttlMs: 10 * MIN, staleMs: 60 * MIN };

describe("api-cache", () => {
  beforeEach(() => {
    resetApiCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));
    vi.mocked(logApiDegraded).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("calls the provider once, then serves the cached value", async () => {
    const fetcher = vi.fn().mockResolvedValue(["a"]);
    expect(await cached({ ...base, fetcher })).toEqual({ data: ["a"], status: "miss" });
    expect(await cached({ ...base, fetcher })).toEqual({ data: ["a"], status: "hit" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shares one upstream call between concurrent identical requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(["a"]);
    await Promise.all([cached({ ...base, fetcher }), cached({ ...base, fetcher }), cached({ ...base, fetcher })]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches once the entry expired", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(["old"]).mockResolvedValueOnce(["new"]);
    await cached({ ...base, fetcher });
    vi.advanceTimersByTime(11 * MIN);
    expect(await cached({ ...base, fetcher })).toEqual({ data: ["new"], status: "miss" });
  });

  it("serves the expired copy when the provider fails", async () => {
    await cached({ ...base, fetcher: async () => ["old"] });
    vi.advanceTimersByTime(11 * MIN);
    const res = await cached({ ...base, fetcher: () => Promise.reject(new Error("429")) });
    expect(res).toEqual({ data: ["old"], status: "stale" });
    expect(logApiDegraded).toHaveBeenCalledWith("sncf", "error", true);
  });

  it("does not serve a copy older than staleMs", async () => {
    await cached({ ...base, fetcher: async () => ["old"] });
    vi.advanceTimersByTime(71 * MIN);
    await expect(cached({ ...base, fetcher: () => Promise.reject(new Error("500")) })).rejects.toBeInstanceOf(
      UpstreamUnavailableError
    );
  });

  it("never stores an empty result", async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    await cached({ ...base, fetcher });
    await cached({ ...base, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("opens the circuit after 3 failures and stops calling the provider", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("503"));
    for (let i = 0; i < 3; i++) {
      await expect(cached({ ...base, key: `k${i}`, fetcher: failing })).rejects.toThrow();
    }
    await expect(cached({ ...base, key: "other", fetcher: failing })).rejects.toMatchObject({ reason: "circuit_open" });
    expect(failing).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(MIN + 1);
    const ok = vi.fn().mockResolvedValue(["back"]);
    expect(await cached({ ...base, key: "other", fetcher: ok })).toEqual({ data: ["back"], status: "miss" });
  });

  it("keeps providers independent", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("503"));
    for (let i = 0; i < 3; i++) await cached({ ...base, key: `k${i}`, fetcher: failing }).catch(() => {});
    const ok = vi.fn().mockResolvedValue(["hotel"]);
    expect(await cached({ ...base, provider: "liteapi", fetcher: ok })).toEqual({ data: ["hotel"], status: "miss" });
  });
});
