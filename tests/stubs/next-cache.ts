import { AsyncLocalStorage } from "node:async_hooks";

/*
  Stands in for `next/cache` in unit tests: an in-memory `unstable_cache`
  that behaves like Next's where the tests rely on it. A value is stored
  (as JSON, like Next's data cache) only when the function resolves, so a
  thrown error is never cached; a cache called inside another is bypassed;
  and every read of the cache is counted, as `next start` would log it with
  NEXT_PRIVATE_DEBUG_CACHE.
*/
const entries = new Map<string, string>();
const nested = new AsyncLocalStorage<true>();

export const cacheStats = { reads: 0 };

export function resetCache() {
  entries.clear();
  cacheStats.reads = 0;
}

export function unstable_cache<Args extends unknown[], T>(fn: (...args: Args) => Promise<T>, keyParts: string[] = []) {
  return async (...args: Args): Promise<T> => {
    if (nested.getStore()) return fn(...args);

    const key = JSON.stringify([keyParts, args]);

    cacheStats.reads++;
    const hit = entries.get(key);

    if (hit !== undefined) return JSON.parse(hit) as T;
    const value = await nested.run(true, () => fn(...args));

    entries.set(key, JSON.stringify(value));

    return value;
  };
}
