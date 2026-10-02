import { getRedis } from './redis';
import { clientIp, errorJson, hashIp } from './request';

// Per-IP limits are sized for a school or office where hundreds of players share one public address
// (one school hit the old 30 spins an hour in minutes and everyone saw errors). Per-user limits stay tight.
export const LIMITS = {
  spin: { max: 1500, windowSec: 3600 },
  grade: { max: 1500, windowSec: 3600 },
  gradeUser: { max: 20, windowSec: 3600 },
  newsletter: { max: 5, windowSec: 3600 },
  delete: { max: 1, windowSec: 86400 },
  register: { max: 120, windowSec: 3600 },
  contact: { max: 5, windowSec: 3600 },
  feedback: { max: 120, windowSec: 3600 },
} as const;
export type LimitScope = keyof typeof LIMITS;

export interface LimitResult { ok: boolean; remaining: number; retryAfter: number }

/** Fixed-window counter in Redis. Fails open if Redis is down so a cache outage never blocks play. */
export async function rateLimit(scope: LimitScope, id: string): Promise<LimitResult> {
  const { max, windowSec } = LIMITS[scope];
  const key = `rate:${scope}:${id}`;
  try {
    const r = getRedis();
    if (await r.get(`rate-override:${id}`)) return { ok: true, remaining: max, retryAfter: 0 };
    const [[, count], [, ttl]] = (await r.multi().incr(key).ttl(key).exec()) as [[null, number], [null, number]];
    if (ttl < 0) await r.expire(key, windowSec);
    const retryAfter = ttl > 0 ? ttl : windowSec;
    return { ok: count <= max, remaining: Math.max(0, max - count), retryAfter };
  } catch {
    return { ok: true, remaining: max, retryAfter: 0 };
  }
}

/** Convenience: limit by hashed IP, returning a 429 response or null. */
export async function limitByIp(req: Request, scope: LimitScope) {
  const res = await rateLimit(scope, hashIp(clientIp(req)));
  if (res.ok) return null;
  const r = errorJson(429, `Too many games from your network right now. Try again in ${Math.max(1, Math.ceil(res.retryAfter / 60))} min.`);
  r.headers.set('Retry-After', String(res.retryAfter));
  return r;
}
