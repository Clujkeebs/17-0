/**
 * How long the big game datasets stay in memory. They only change when the daily syncs run, so an hour is invisible to
 * players, and a dataset nobody asks for in that hour is dropped instead of sitting in memory until the next deploy.
 */
export const DATASET_TTL_MS = 60 * 60_000;

/**
 * Keeps one loaded value for `ttlMs`, then drops it. Callers that arrive while a load is running share it, so a burst of
 * requests after the value expires runs the query once and builds one copy of the data, not one per request. A failed
 * load is not kept: the next call tries again.
 */
export function memoAsync<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let hit: { at: number; value: T } | null = null;
  let pending: Promise<T> | null = null;
  const run = async () => {
    try {
      const value = await load();
      const mine = { at: Date.now(), value };
      hit = mine;
      const timer = setTimeout(() => { if (hit === mine) hit = null; }, ttlMs);
      if (typeof timer === 'object') timer.unref();
      return mine.value;
    } finally {
      pending = null;
    }
  };
  return () => (hit && Date.now() - hit.at < ttlMs ? Promise.resolve(hit.value) : (pending ??= run()));
}

/** The same, one cached value per key (for example one college basketball league each). */
export function memoByKey<K, T>(ttlMs: number, load: (key: K) => Promise<T>): (key: K) => Promise<T> {
  const byKey = new Map<K, () => Promise<T>>();
  return (key) => {
    let get = byKey.get(key);
    if (!get) byKey.set(key, (get = memoAsync(ttlMs, () => load(key))));
    return get();
  };
}
