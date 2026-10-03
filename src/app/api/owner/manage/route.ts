import { z } from 'zod';
import { challengeCounts } from '@/lib/server/challenges';
import { and, eq, gte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireOwner } from '@/lib/server/owner';
import { audit } from '@/lib/server/audit';
import { dailyDateET } from '@/lib/game/daily';
import { grant } from '@/lib/server/points';
import { shopItem } from '@/lib/shop';
import { GAMES } from '@/lib/game-registry';
import { errorJson, json } from '@/lib/server/request';
import { getRedis, invalidatePrefix } from '@/lib/server/redis';

export const runtime = 'nodejs';

const User = z.string().min(1).max(40);
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('points'), username: User, amount: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0), note: z.string().max(80).optional() }),
  z.object({ action: z.literal('item'), username: User, item: z.string().max(40) }),
  z.object({ action: z.literal('hide'), username: User, hidden: z.boolean() }),
  z.object({ action: z.literal('reset-today'), username: User, game: z.string().max(40) }),
  z.object({ action: z.literal('banner'), text: z.string().max(160).nullable() }),
  z.object({ action: z.literal('stats') }),
]);

async function userByName(username: string) {
  const [u] = await db.select().from(schema.users).where(dsql`lower(${schema.users.username}) = ${username.toLowerCase().replace(/^@/, '')}`).limit(1);
  return u ?? null;
}

/** Owner tools: points, items, leaderboard moderation, a site-wide banner, live numbers. Owner account only, every action audited. */
export async function POST(req: Request) {
  const s = await requireOwner();
  if (!s) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Check the form.');
  const b = parsed.data;

  if (b.action === 'stats') {
    const today = dailyDateET();
    const since15 = new Date(Date.now() - 15 * 60_000), dayStart = new Date(`${today}T04:00:00Z`);
    const [[g], [a], [u], [n], [p]] = await Promise.all([
      db.select({ n: dsql<number>`count(*)::int` }).from(schema.gameResults).where(gte(schema.gameResults.createdAt, dayStart)),
      db.select({ n: dsql<number>`count(distinct coalesce(${schema.gameResults.userId}::text, ${schema.gameResults.sessionId}::text))::int` }).from(schema.gameResults).where(gte(schema.gameResults.createdAt, since15)),
      db.select({ n: dsql<number>`count(*)::int` }).from(schema.users).where(gte(schema.users.createdAt, dayStart)),
      db.select({ n: dsql<number>`count(*)::int` }).from(schema.users),
      db.select({ n: dsql<number>`coalesce(sum(${schema.users.points}), 0)::int` }).from(schema.users),
    ]);
    const top = await db.select({ game: schema.gameResults.gameType, n: dsql<number>`count(*)::int` }).from(schema.gameResults).where(gte(schema.gameResults.createdAt, dayStart)).groupBy(schema.gameResults.gameType).orderBy(dsql`count(*) desc`).limit(5);
    const ch = await challengeCounts(dayStart).catch(() => ({ challenges: 0, entries: 0 }));
    return json({ ok: true, stats: { gamesToday: g.n, activeNow: a.n, signupsToday: u.n, players: n.n, pointsHeld: p.n, topGames: top, challengesToday: ch.challenges, challengeEntriesToday: ch.entries } });
  }

  if (b.action === 'banner') {
    const r = getRedis();
    if (b.text?.trim()) await r.set('site:banner', b.text.trim()); else await r.del('site:banner');
    await audit(s.user.id, 'owner.banner', 'site', 'banner', { text: b.text });
    return json({ ok: true, message: b.text?.trim() ? 'Banner is up.' : 'Banner removed.' });
  }

  const u = await userByName(b.username);
  if (!u) return errorJson(404, `No player named @${b.username}.`);

  if (b.action === 'points') {
    await grant(u.id, b.amount, 'owner', `${Date.now()}:${b.note ?? ''}`.slice(0, 120));
    await audit(s.user.id, 'owner.points', 'user', u.id, { amount: b.amount, note: b.note });
    return json({ ok: true, message: `${b.amount > 0 ? 'Gave' : 'Took'} ${Math.abs(b.amount)} points ${b.amount > 0 ? 'to' : 'from'} @${u.username}.` });
  }
  if (b.action === 'item') {
    const item = shopItem(b.item);
    if (!item || item.ownerOnly) return errorJson(400, 'Pick an item from the shop (owner exclusives stay yours).');
    await db.insert(schema.userItems).values({ userId: u.id, itemKey: item.key, pricePaid: 0 }).onConflictDoNothing();
    await audit(s.user.id, 'owner.item', 'user', u.id, { item: item.key });
    return json({ ok: true, message: `@${u.username} now owns ${item.label}.` });
  }
  if (b.action === 'hide') {
    await db.update(schema.users).set({ lbHidden: b.hidden }).where(eq(schema.users.id, u.id));
    await invalidatePrefix('lb:').catch(() => {});
    await audit(s.user.id, b.hidden ? 'owner.hide' : 'owner.unhide', 'user', u.id);
    return json({ ok: true, message: b.hidden ? `@${u.username} is hidden from every leaderboard.` : `@${u.username} is back on the leaderboards.` });
  }
  // reset-today: clears one ranked result for today so the player can replay it (for a bug or a misclick).
  if (!GAMES.some((g) => g.slug === b.game)) return errorJson(400, 'Unknown game.');
  const del = await db.delete(schema.gameResults).where(and(eq(schema.gameResults.userId, u.id), eq(schema.gameResults.gameType, b.game), eq(schema.gameResults.isDaily, true), eq(schema.gameResults.dailyDate, dailyDateET()))).returning({ id: schema.gameResults.id });
  await invalidatePrefix('lb:').catch(() => {});
  await audit(s.user.id, 'owner.reset-today', 'user', u.id, { game: b.game, removed: del.length });
  return json({ ok: true, message: del.length ? `Cleared @${u.username}'s ranked ${b.game} for today. They can play it again.` : `@${u.username} has no ranked ${b.game} today.` });
}
