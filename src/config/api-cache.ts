export type ApiProvider = "sncf" | "liteapi" | "travelpayouts" | "overpass";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function dailyLimit(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const apiCacheConfig = {
  /** In-memory entries kept per server instance (oldest evicted first). */
  memoryMaxEntries: 500,
  /** Supabase read budget: past it, the request goes upstream as if the cache were empty. */
  storeTimeoutMs: 1500,
  /** After a Supabase error (e.g. table not created yet), skip the store for this long. */
  storeRetryMs: 5 * MIN,
  /** Consecutive upstream failures that open the circuit, and how long it stays open. */
  breaker: { failureThreshold: 3, cooldownMs: MIN },
  /** Minimum gap between two identical "degraded" logs (provider + reason). */
  degradedLogIntervalMs: MIN,
  /** Optional daily upstream-call quotas. Unset = unlimited (calls are still counted). */
  dailyLimits: {
    sncf: dailyLimit(process.env.API_DAILY_LIMIT_SNCF),
    liteapi: dailyLimit(process.env.API_DAILY_LIMIT_LITEAPI),
    travelpayouts: dailyLimit(process.env.API_DAILY_LIMIT_TRAVELPAYOUTS),
    overpass: dailyLimit(process.env.API_DAILY_LIMIT_OVERPASS),
  } satisfies Record<ApiProvider, number | undefined>,
  /** ttl = fresh lifetime; stale = extra time an expired entry may still be served when the provider fails. */
  policies: {
    stations: { ttlMs: 7 * DAY, staleMs: 30 * DAY },
    routeGeometry: { ttlMs: 7 * DAY, staleMs: 30 * DAY },
    trainTimetable: { ttlMs: 10 * MIN, staleMs: 2 * HOUR },
    trainDuration: { ttlMs: 6 * HOUR, staleMs: 30 * DAY },
    flights: { ttlMs: 3 * HOUR, staleMs: DAY },
    hotelRates: { ttlMs: HOUR, staleMs: DAY },
    /** Hotels last seen by LiteAPI around a venue, prices stripped: date-independent fallback. */
    venueHotels: { ttlMs: 30 * DAY, staleMs: 30 * DAY },
    osmHotels: { ttlMs: 7 * DAY, staleMs: 30 * DAY },
  },
} as const;
