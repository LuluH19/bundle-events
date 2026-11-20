const store = new Map<string, { value: unknown; expires: number }>();

/** In-memory TTL cache for server-side lookups. Failures (thrown errors) are never cached. */
export async function memoize<T>(key: string, ttlMs: number, run: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await run();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}
