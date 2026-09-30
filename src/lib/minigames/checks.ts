import { getRedis } from '@/lib/server/redis';

const key = (slug: string, date: string, userId: string) => `mini:chk:${slug}:${date}:${userId}`;

/** Records a ranked (Today) check so the final score can't ignore it. */
export async function recordCheck(slug: string, date: string, userId: string, guess: unknown, max?: number): Promise<boolean> {
  const r = getRedis();
  const k = key(slug, date, userId);
  if (max != null && (await r.llen(k)) >= max) return false;
  await r.multi().rpush(k, JSON.stringify(guess)).expire(k, 3 * 86400).exec();
  return true;
}

export async function readChecks(slug: string, date: string, userId: string): Promise<unknown[]> {
  const list = await getRedis().lrange(key(slug, date, userId), 0, -1);
  return list.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter((x) => x != null);
}
