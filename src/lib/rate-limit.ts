import "server-only";

import { getSupabaseAdmin } from "@/src/lib/supabase/server";

/**
 * Request limits for our own routes (issue #196).
 *
 * - `allowRequest`: fixed window per key, in memory. Per server instance only, so it
 *   slows down one client hammering a route but is not a hard guarantee.
 * - `underDailyLimit`: daily total shared by every instance, counted with the same
 *   Supabase `increment_api_usage` counter as the provider quotas of the API cache (#153).
 */

const MAX_KEYS = 5000;
const windows = new Map<string, { count: number; resetAt: number }>();

export function allowRequest(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.delete(key);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    while (windows.size > MAX_KEYS) {
      const oldest = windows.keys().next().value;
      if (oldest === undefined) break;
      windows.delete(oldest);
    }
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

/** Counts one call for `name` today and says whether the total is still within `limit`. Fails open. */
export async function underDailyLimit(name: string, limit: number, timeoutMs = 1500): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .rpc("increment_api_usage", { p_provider: name })
      .abortSignal(AbortSignal.timeout(timeoutMs));
    if (error || typeof data !== "number") return true;
    return data <= limit;
  } catch {
    return true;
  }
}

/** Client IP as seen by the platform (Vercel sets `x-forwarded-for`). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test helper. */
export function resetRateLimits() {
  windows.clear();
}
