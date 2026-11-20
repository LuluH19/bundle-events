import "server-only";

import { apiCacheConfig, type ApiProvider } from "@/src/config";
import { getSupabaseAdmin } from "@/src/lib/supabase/server";
import { logApiDegraded, type ApiDegradedReason } from "@/src/lib/posthog-logs";

/**
 * Shared cache in front of every token-billed provider (issue #153).
 *
 * Lookup order: in-memory (per instance) -> Supabase `api_cache` (shared by every
 * user and instance) -> upstream. Identical concurrent requests share one upstream
 * call. When the provider fails, is over its daily quota or has its circuit open,
 * the last known entry is served even if expired ("stale"), up to `staleMs`.
 */

export type CacheStatus = "hit" | "miss" | "stale";

export interface CachedResult<T> {
  data: T;
  status: CacheStatus;
}

export interface CachedOptions<T> {
  provider: ApiProvider;
  /** Normalised request identity, without secrets. Prefixed with the provider. */
  key: string;
  ttlMs: number;
  /** How long past expiry the entry may still be served when the provider is unavailable. */
  staleMs: number;
  /** Must throw on provider failure (not return an empty value), so the stale fallback can kick in. */
  fetcher: () => Promise<T>;
  /** Whether a fresh result is worth storing. Default: anything but an empty array/object. */
  shouldStore?: (data: T) => boolean;
}

export class UpstreamUnavailableError extends Error {
  constructor(
    readonly provider: ApiProvider,
    readonly reason: ApiDegradedReason,
    options?: { cause?: unknown }
  ) {
    super(`${provider} unavailable (${reason})`, options);
    this.name = "UpstreamUnavailableError";
  }
}

type Entry = { data: unknown; expiresAt: number };

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<CachedResult<unknown>>>();
const breakers = new Map<ApiProvider, { failures: number; openUntil: number }>();
const lastDegradedLog = new Map<string, number>();
let storeDisabledUntil = 0;

export function cached<T>(opts: CachedOptions<T>): Promise<CachedResult<T>> {
  const key = `${opts.provider}:${opts.key}`;
  const mem = memory.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return Promise.resolve({ data: mem.data as T, status: "hit" });
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<CachedResult<T>>;

  const run = resolveEntry(opts, key, mem).finally(() => inflight.delete(key));
  inflight.set(key, run as Promise<CachedResult<unknown>>);
  return run;
}

async function resolveEntry<T>(opts: CachedOptions<T>, key: string, mem: Entry | undefined): Promise<CachedResult<T>> {
  const stored = await readStore(key);
  const known = fresher(mem, stored);
  const now = Date.now();

  if (known && known.expiresAt > now) {
    remember(key, known);
    return { data: known.data as T, status: "hit" };
  }
  const stale = known && now - known.expiresAt <= opts.staleMs ? known : null;

  const blocked = await gate(opts.provider);
  if (blocked) return degrade(opts.provider, blocked, stale);

  let data: T;
  try {
    data = await opts.fetcher();
  } catch (err) {
    recordFailure(opts.provider);
    return degrade(opts.provider, "error", stale, err);
  }
  recordSuccess(opts.provider);

  if ((opts.shouldStore ?? isNonEmpty)(data)) {
    const entry = { data, expiresAt: Date.now() + opts.ttlMs };
    remember(key, entry);
    void writeStore(key, opts.provider, entry);
  }
  return { data, status: "miss" };
}

function degrade<T>(provider: ApiProvider, reason: ApiDegradedReason, stale: Entry | null, cause?: unknown): CachedResult<T> {
  const logKey = `${provider}:${reason}`;
  const now = Date.now();
  if (now - (lastDegradedLog.get(logKey) ?? 0) >= apiCacheConfig.degradedLogIntervalMs) {
    lastDegradedLog.set(logKey, now);
    try {
      logApiDegraded(provider, reason, !!stale);
    } catch {
      // logging must never break a request
    }
  }
  if (stale) return { data: stale.data as T, status: "stale" };
  throw new UpstreamUnavailableError(provider, reason, { cause });
}

function isNonEmpty(data: unknown): boolean {
  if (data == null) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === "object") return Object.keys(data).length > 0;
  return true;
}

function fresher(a: Entry | undefined | null, b: Entry | null): Entry | null {
  if (!a) return b;
  if (!b) return a;
  return b.expiresAt > a.expiresAt ? b : a;
}

function remember(key: string, entry: Entry) {
  memory.delete(key);
  memory.set(key, entry);
  while (memory.size > apiCacheConfig.memoryMaxEntries) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

/** Stores a value computed elsewhere (no upstream call, no quota count). */
export async function prime(provider: ApiProvider, key: string, data: unknown, ttlMs: number): Promise<void> {
  const fullKey = `${provider}:${key}`;
  const entry = { data, expiresAt: Date.now() + ttlMs };
  remember(fullKey, entry);
  await writeStore(fullKey, provider, entry);
}

/** Reads a value without ever calling the provider. Expired entries count while within `staleMs`. */
export async function peek<T>(provider: ApiProvider, key: string, staleMs: number): Promise<T | null> {
  const fullKey = `${provider}:${key}`;
  const known = fresher(memory.get(fullKey), await readStore(fullKey));
  if (!known || Date.now() - known.expiresAt > staleMs) return null;
  return known.data as T;
}

// ── Circuit breaker + daily quota ──

async function gate(provider: ApiProvider): Promise<ApiDegradedReason | null> {
  const breaker = breakers.get(provider);
  if (breaker && breaker.openUntil > Date.now()) return "circuit_open";

  const limit = apiCacheConfig.dailyLimits[provider];
  if (!limit) {
    void countUsage(provider);
    return null;
  }
  const used = await countUsage(provider);
  return used != null && used > limit ? "quota" : null;
}

function recordFailure(provider: ApiProvider) {
  const b = breakers.get(provider) ?? { failures: 0, openUntil: 0 };
  b.failures += 1;
  if (b.failures >= apiCacheConfig.breaker.failureThreshold) {
    b.openUntil = Date.now() + apiCacheConfig.breaker.cooldownMs;
    b.failures = 0;
  }
  breakers.set(provider, b);
}

function recordSuccess(provider: ApiProvider) {
  breakers.delete(provider);
}

// ── Supabase store (optional: every failure degrades to memory-only) ──

function store() {
  if (Date.now() < storeDisabledUntil) return null;
  try {
    return getSupabaseAdmin();
  } catch {
    storeDisabledUntil = Date.now() + apiCacheConfig.storeRetryMs;
    return null;
  }
}

function disableStore(error: unknown) {
  if (Date.now() >= storeDisabledUntil) {
    console.warn("[api-cache] Supabase store unavailable, using memory only:", error);
  }
  storeDisabledUntil = Date.now() + apiCacheConfig.storeRetryMs;
}

async function readStore(key: string): Promise<Entry | null> {
  const db = store();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("api_cache")
      .select("payload, expires_at")
      .eq("key", key)
      .abortSignal(AbortSignal.timeout(apiCacheConfig.storeTimeoutMs))
      .maybeSingle();
    if (error) {
      disableStore(error);
      return null;
    }
    if (!data) return null;
    return { data: data.payload, expiresAt: Date.parse(data.expires_at) };
  } catch (err) {
    disableStore(err);
    return null;
  }
}

async function writeStore(key: string, provider: ApiProvider, entry: Entry) {
  const db = store();
  if (!db) return;
  try {
    const { error } = await db.from("api_cache").upsert({
      key,
      provider,
      payload: entry.data,
      expires_at: new Date(entry.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) disableStore(error);
  } catch (err) {
    disableStore(err);
  }
}

async function countUsage(provider: ApiProvider): Promise<number | null> {
  const db = store();
  if (!db) return null;
  try {
    const { data, error } = await db
      .rpc("increment_api_usage", { p_provider: provider })
      .abortSignal(AbortSignal.timeout(apiCacheConfig.storeTimeoutMs));
    if (error) {
      disableStore(error);
      return null;
    }
    return typeof data === "number" ? data : null;
  } catch (err) {
    disableStore(err);
    return null;
  }
}

/** Test helper: clears all module state. */
export function resetApiCache() {
  memory.clear();
  inflight.clear();
  breakers.clear();
  lastDegradedLog.clear();
  storeDisabledUntil = 0;
}
