import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/posthog-logs", () => ({ logApiDegraded: vi.fn() }));

type StoreAnswer = { data: unknown; error: unknown };
const { store } = vi.hoisted(() => ({
  store: { reads: 0, nextRead: null as StoreAnswer | null },
}));

/** Minimal Supabase client: every read answers `store.nextRead` (or an empty row). */
vi.mock("@/src/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        abortSignal: () => q,
        maybeSingle: async () => {
          store.reads += 1;
          return store.nextRead ?? { data: null, error: null };
        },
        upsert: () => ({ abortSignal: async () => ({ error: null }) }),
      };
      return q;
    },
    rpc: () => ({ abortSignal: async () => ({ data: 1, error: null }) }),
  }),
}));

import { apiCacheConfig } from "@/src/config";
import { cached, isStoreTimeout, resetApiCache } from "@/src/lib/api-cache";

const SEC = 1000;
const base = { provider: "sncf" as const, ttlMs: 60 * SEC, staleMs: 60 * SEC };
const call = (key: string) => cached({ ...base, key, fetcher: async () => [key] });

// What supabase-js returns when the abort signal fires (seen in the Vercel logs of issue #180).
const timeoutError = { message: "TimeoutError: The operation was aborted due to timeout", details: "", hint: "", code: "" };

describe("api-cache Supabase store (issue #180)", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetApiCache();
    store.reads = 0;
    store.nextRead = null;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:46:00Z"));
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    warn.mockRestore();
  });

  it("recognises timeouts, thrown or returned", () => {
    expect(isStoreTimeout(timeoutError)).toBe(true);
    expect(isStoreTimeout(new DOMException("aborted", "TimeoutError"))).toBe(true);
    expect(isStoreTimeout({ message: 'relation "api_cache" does not exist', code: "42P01" })).toBe(false);
    expect(isStoreTimeout(null)).toBe(false);
  });

  it("pauses the store only briefly after a timeout", async () => {
    store.nextRead = { data: null, error: timeoutError };
    await call("a");
    expect(store.reads).toBe(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("timed out"), timeoutError);

    store.nextRead = null;
    await call("b");
    expect(store.reads).toBe(1); // paused: memory only

    vi.advanceTimersByTime(apiCacheConfig.storeTimeoutRetryMs + 1);
    await call("c");
    expect(store.reads).toBe(2); // back well before the 5 min pause of real errors
  });

  it("keeps the long pause for real errors", async () => {
    store.nextRead = { data: null, error: { message: 'relation "api_cache" does not exist', code: "42P01" } };
    await call("a");
    store.nextRead = null;

    vi.advanceTimersByTime(apiCacheConfig.storeTimeoutRetryMs + 1);
    await call("b");
    expect(store.reads).toBe(1);

    vi.advanceTimersByTime(apiCacheConfig.storeRetryMs);
    await call("c");
    expect(store.reads).toBe(2);
  });
});
