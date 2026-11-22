const MIN = 60 * 1000;

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Limits applied by `/api/bundles` before anything is written to Supabase (issue #196). */
export const bundlesConfig = {
  /**
   * Largest accepted request body. Route options keep their full map geometry
   * (OSRM `overview=full`): one Paris-Marseille car route is ~260 KB, so a round
   * trip across France can reach ~1 MB. 64 KB would reject real bundles.
   */
  maxBodyBytes: 2 * 1024 * 1024,
  /** Structural bounds checked by `validateBundleData`. */
  maxStringLength: 2000,
  maxSegmentsPerRoute: 100,
  maxPointsPerSegment: 50_000,
  maxDepth: 12,
  /** Creations per client IP and per server instance (in memory, best effort). */
  createPerIp: { max: 20, windowMs: 10 * MIN },
  /** Creations per UTC day for the whole site, counted in Supabase `api_usage` (shared by every instance). */
  dailyCreateLimit: positiveInt(process.env.BUNDLES_DAILY_CREATE_LIMIT, 5000),
} as const;
