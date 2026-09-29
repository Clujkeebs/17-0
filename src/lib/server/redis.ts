import IORedis from 'ioredis';

const g = globalThis as unknown as { redis?: IORedis; cacheRedis?: IORedis };

export function getRedis(): IORedis {
  if (!g.redis) {
    g.redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // required by BullMQ
      enableOfflineQueue: true,
      lazyConnect: false,
    });
    g.redis.on('error', (e) => console.error('[redis]', e.message));
  }
  return g.redis;
}

/** Separate fail-fast client for the cache layer: a Redis outage must never hang a page render. */
function getCacheRedis(): IORedis {
  if (!g.cacheRedis) {
    g.cacheRedis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1, enableOfflineQueue: false, commandTimeout: 500, connectTimeout: 2000,
    });
    g.cacheRedis.on('error', () => { /* logged by main client */ });
  }
  return g.cacheRedis;
}

/** Cross-instance cache for public data only. Never store user-specific data here. */
export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const r = getCacheRedis();
  try {
    const hit = await r.get(`cache:${key}`);
    if (hit) return JSON.parse(hit) as T;
  } catch { /* cache is best-effort */ }
  const val = await fn();
  try { await r.set(`cache:${key}`, JSON.stringify(val), 'EX', ttlSec); } catch { /* ignore */ }
  return val;
}

export async function invalidatePrefix(prefix: string) {
  const r = getRedis();
  const stream = r.scanStream({ match: `cache:${prefix}*`, count: 200 });
  for await (const keys of stream) if ((keys as string[]).length) await r.del(...(keys as string[]));
}
