export const runtime = 'nodejs';

import type { AnalyticsEvent } from '@/lib/analytics';
import { getRedis } from '@/lib/server/redis';
import { dailyDateET } from '@/lib/game/daily';

// Runtime copy of the AnalyticsEvent union. The type check below fails if the two drift.
const EVENTS = [
  'game_started', 'game_completed', 'game_shared', 'signup_started', 'signup_completed',
  'newsletter_viewed', 'newsletter_submitted', 'newsletter_confirmed', 'leaderboard_viewed', 'ad_impression', 'ad_click',
] as const satisfies readonly AnalyticsEvent[];
type Missing = Exclude<AnalyticsEvent, (typeof EVENTS)[number]>;
const _exhaustive: Missing extends never ? true : Missing = true;
void _exhaustive;
const ALLOWED = new Set<string>(EVENTS);

const RETENTION_SEC = 90 * 86400;
const noContent = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/** Coarse path bucket: first segment only, so no ids or query strings are stored. */
function pathBucket(path: unknown): string {
  if (typeof path !== 'string' || !path.startsWith('/')) return 'other';
  const seg = path.split(/[?#]/)[0].split('/')[1] ?? '';
  return /^[a-z0-9-]{1,32}$/.test(seg) ? `/${seg}` : seg === '' ? '/' : 'other';
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (text.length > 4096) return noContent();
    const body = JSON.parse(text) as { event?: unknown; path?: unknown };
    if (typeof body.event !== 'string' || !ALLOWED.has(body.event)) return noContent();
    // Props are intentionally not stored: counters only, no PII.
    const key = `events:${dailyDateET()}:${body.event}`;
    await getRedis().multi()
      .hincrby(key, 'total', 1)
      .hincrby(key, pathBucket(body.path), 1)
      .expire(key, RETENTION_SEC)
      .exec();
  } catch { /* analytics never errors to the client */ }
  return noContent();
}
