import { describe, expect, it } from "vitest";
import { createStoreHealth, isTimeoutError } from "@/src/lib/store-health";

const config = { errorRetryMs: 300_000, timeoutThreshold: 3, timeoutRetryMs: 30_000 };
const timeout = { name: "Error", message: "TimeoutError: The operation was aborted due to timeout" };

describe("isTimeoutError", () => {
  it("reconnaît les délais dépassés de Supabase et d'AbortSignal", () => {
    expect(isTimeoutError(timeout)).toBe(true);
    expect(isTimeoutError(new DOMException("signal timed out", "TimeoutError"))).toBe(true);
    expect(isTimeoutError({ message: 'relation "api_cache" does not exist' })).toBe(false);
  });
});

describe("createStoreHealth", () => {
  it("garde le cache Supabase après un délai isolé", () => {
    const h = createStoreHealth(config);
    expect(h.failed(timeout, 0)).toEqual({ kind: "timeout", disabledForMs: 0, log: false });
    expect(h.available(1)).toBe(true);
  });

  it("le coupe 30 s après 3 délais dépassés d'affilée, en le signalant une fois", () => {
    const h = createStoreHealth(config);
    h.failed(timeout, 0);
    h.failed(timeout, 1);
    expect(h.failed(timeout, 2)).toEqual({ kind: "timeout", disabledForMs: 30_000, log: true });
    expect(h.available(29_000)).toBe(false);
    expect(h.available(30_002)).toBe(true);
  });

  it("remet le compteur à zéro après une lecture réussie", () => {
    const h = createStoreHealth(config);
    h.failed(timeout, 0);
    h.failed(timeout, 1);
    h.succeeded();
    expect(h.failed(timeout, 2).disabledForMs).toBe(0);
  });

  it("coupe 5 min sur une vraie erreur (table absente)", () => {
    const h = createStoreHealth(config);
    expect(h.failed({ message: 'relation "api_cache" does not exist' }, 0)).toEqual({ kind: "error", disabledForMs: 300_000, log: true });
    expect(h.available(299_999)).toBe(false);
  });
});
