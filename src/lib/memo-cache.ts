const store = new Map<string, { value: unknown; expires: number }>();

/** Keys come from request parameters: cap the map so arbitrary queries cannot grow it forever. */
const MAX_ENTRIES = 2000;

/** In-memory TTL cache for server-side lookups. Failures (thrown errors) are never cached. */
export async function memoize<T>(key: string, ttlMs: number, run: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await run();
  store.delete(key);
  store.set(key, { value, expires: Date.now() + ttlMs });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
  return value;
}
