import { and, eq, gte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { computeStreak, dailyDateET } from '@/lib/game/daily';
import { GAMES } from '@/lib/game-registry';
import { SHOP_ITEMS, shopItem, type ItemKind } from '@/lib/shop';
import { isOwnerEmail } from '@/lib/cosmetics';

/**
 * Points: earned by playing, spent in the shop. Every change is a row in point_events with a unique
 * (user, reason, ref), so a grant replayed by a retry, a double click or a re-run job is paid once.
 * users.points is the running balance, updated in the same transaction as the event.
 */
export const EARN = {
  welcome: 50,
  daily: 10,
  perfect: 25,
  casual: 1,
  casualDailyCap: 15,
  streak: { 3: 15, 7: 40, 14: 100, 30: 250, 50: 400, 100: 1000 } as Record<number, number>,
  board: [50, 35, 25, 20, 15, 12, 10, 10, 10, 10],
  week: [150, 100, 60],
};

export class ShopError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Adds (or with a negative amount, spends) points once per (reason, ref). Returns true if it applied. */
export async function grant(userId: string, amount: number, reason: string, ref: string, tx?: Tx): Promise<boolean> {
  const run = async (t: Tx) => {
    const ins = await t.insert(schema.pointEvents).values({ userId, amount, reason, ref }).onConflictDoNothing().returning({ id: schema.pointEvents.id });
    if (!ins.length) return false;
    await t.update(schema.users).set({
      points: dsql`${schema.users.points} + ${amount}`,
      ...(amount > 0 ? { pointsEarned: dsql`${schema.users.pointsEarned} + ${amount}` } : {}),
    }).where(eq(schema.users.id, userId));
    return true;
  };
  return tx ? run(tx) : db.transaction(run);
}

/** Points for one graded game. Ranked (Today) results earn the most; casual play earns a little, capped per day. */
export async function earnForResult(userId: string, gameType: string, isDaily: boolean, perfect: boolean, resultId: string) {
  const today = dailyDateET();
  if (isDaily) {
    await grant(userId, EARN.daily, 'daily', `${gameType}:${today}`);
    if (perfect) await grant(userId, EARN.perfect, 'perfect', `${gameType}:${today}`);
    // Streak milestones: the streak is days in a row with at least one ranked game.
    const rows = await db.selectDistinct({ d: schema.gameResults.dailyDate }).from(schema.gameResults)
      .where(and(eq(schema.gameResults.userId, userId), eq(schema.gameResults.isDaily, true)));
    const streak = computeStreak(rows.map((r) => r.d!).filter(Boolean), today);
    if (EARN.streak[streak]) await grant(userId, EARN.streak[streak], 'streak', `${streak}:${today}`);
    return;
  }
  const start = new Date(`${today}T04:00:00Z`);
  const [c] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.pointEvents)
    .where(and(eq(schema.pointEvents.userId, userId), eq(schema.pointEvents.reason, 'casual'), gte(schema.pointEvents.createdAt, start)));
  if ((c?.n ?? 0) < EARN.casualDailyCap) await grant(userId, EARN.casual, 'casual', resultId);
}

/** Top ten on yesterday's board for every game earn points. Run once a day after midnight ET; safe to re-run. */
export async function awardDailyBoards(date: string): Promise<number> {
  let paid = 0;
  for (const g of GAMES) {
    const rows = await db.execute<{ user_id: string }>(dsql`
      select user_id from (
        select distinct on (user_id) user_id, score, created_at from game_results
        where game_type = ${g.slug} and daily_date = ${date} and is_daily and user_id is not null and not flagged and user_id not in (select id from user_accounts where lb_hidden)
        order by user_id, score desc, created_at asc
      ) t order by score desc, created_at asc limit ${EARN.board.length}`);
    for (const [i, r] of [...rows].entries()) if (await grant(r.user_id, EARN.board[i], 'board', `${g.slug}:${date}`)) paid++;
  }
  return paid;
}

/** Top three of the week (Monday to Sunday ET, best single ranked result) for every game. Run on Mondays. */
export async function awardWeek(weekStart: string): Promise<number> {
  const end = new Date(Date.parse(`${weekStart}T12:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
  let paid = 0;
  for (const g of GAMES) {
    const rows = await db.execute<{ user_id: string }>(dsql`
      select user_id from (
        select distinct on (user_id) user_id, score, created_at from game_results
        where game_type = ${g.slug} and daily_date between ${weekStart} and ${end} and is_daily and user_id is not null and not flagged and user_id not in (select id from user_accounts where lb_hidden)
        order by user_id, score desc, created_at asc
      ) t order by score desc, created_at asc limit ${EARN.week.length}`);
    for (const [i, r] of [...rows].entries()) if (await grant(r.user_id, EARN.week[i], 'week', `${g.slug}:${weekStart}`)) paid++;
  }
  return paid;
}

/** One-time launch grant: points for every ranked game and perfect result played before the shop opened. */
export async function backfillPoints(): Promise<number> {
  const rows = await db.execute<{ user_id: string; n: number; p: number }>(dsql`
    select user_id, count(*)::int as n, count(*) filter (where (result_data->>'perfect')::boolean is true
      or (result_data->>'wins')::int in (17, 82, 162) and (result_data->>'losses')::int = 0 or (result_data->>'rating')::float >= 97)::int as p
    from game_results where user_id is not null and is_daily and not flagged group by user_id`);
  let paid = 0;
  for (const r of rows) if (await grant(r.user_id, r.n * EARN.daily + r.p * EARN.perfect, 'backfill', 'launch')) paid++;
  // Most early players played Casual: one point per casual game before launch, up to 200.
  const casual = await db.execute<{ user_id: string; n: number }>(dsql`
    select user_id, count(*)::int as n from game_results where user_id is not null and not is_daily and not flagged and created_at < now() group by user_id`);
  for (const r of casual) if (await grant(r.user_id, Math.min(200, r.n * EARN.casual), 'backfill', 'launch-casual')) paid++;
  return paid;
}

/* ------------------------------------------------------------------ shop */

/** Item keys a player owns. The owner owns everything, including items added later, without any rows. */
export async function ownedKeys(userId: string, email: string | null | undefined): Promise<Set<string>> {
  if (isOwnerEmail(email)) return new Set(SHOP_ITEMS.map((i) => i.key));
  const rows = await db.select({ k: schema.userItems.itemKey }).from(schema.userItems).where(eq(schema.userItems.userId, userId));
  return new Set(rows.map((r) => r.k));
}

/** Units sold for each limited item. */
export async function stockSold(): Promise<Record<string, number>> {
  const rows = await db.select().from(schema.shopStock);
  return Object.fromEntries(rows.map((r) => [r.itemKey, r.sold]));
}

/** Buys an item: checks the price and, for limited items, the stock under a row lock, all in one transaction. */
export async function buy(userId: string, email: string | null | undefined, itemKey: string) {
  const item = shopItem(itemKey);
  if (!item || item.ownerOnly) throw new ShopError('That item is not for sale.', 404);
  if (isOwnerEmail(email)) throw new ShopError('You already own everything in the shop.', 409);
  return db.transaction(async (tx) => {
    const [have] = await tx.select().from(schema.userItems).where(and(eq(schema.userItems.userId, userId), eq(schema.userItems.itemKey, itemKey))).limit(1);
    if (have) throw new ShopError('You already own that.', 409);
    if (item.limit) {
      await tx.insert(schema.shopStock).values({ itemKey }).onConflictDoNothing();
      const [row] = await tx.execute<{ sold: number }>(dsql`select sold from shop_stock where item_key = ${itemKey} for update`);
      if (Number(row?.sold ?? 0) >= item.limit) throw new ShopError('Sold out. Every one of these has been claimed.', 409);
      await tx.update(schema.shopStock).set({ sold: dsql`${schema.shopStock.sold} + 1` }).where(eq(schema.shopStock.itemKey, itemKey));
    }
    const paid = await tx.update(schema.users).set({ points: dsql`${schema.users.points} - ${item.price}` })
      .where(and(eq(schema.users.id, userId), gte(schema.users.points, item.price))).returning({ points: schema.users.points });
    if (!paid.length) throw new ShopError('Not enough points yet. Play a ranked game to earn more.', 402);
    await tx.insert(schema.userItems).values({ userId, itemKey, pricePaid: item.price });
    await tx.insert(schema.pointEvents).values({ userId, amount: -item.price, reason: 'buy', ref: itemKey });
    return { points: paid[0].points };
  });
}

const COLUMN: Record<ItemKind, keyof typeof schema.users.$inferInsert> = {
  font: 'nameFont', color: 'nameColor', border: 'equipBorder', banner: 'equipBanner', title: 'equipTitle', flair: 'equipFlair',
};

/** Equips an owned item, or clears a slot when key is null. Owner exclusives equip only for the owner. */
export async function equip(userId: string, email: string | null | undefined, kind: ItemKind, key: string | null) {
  if (key !== null) {
    const item = shopItem(key);
    if (!item || item.kind !== kind) throw new ShopError('Unknown item.', 404);
    if (!(await ownedKeys(userId, email)).has(key)) throw new ShopError('Buy it first.', 403);
  }
  await db.update(schema.users).set({ [COLUMN[kind]]: key }).where(eq(schema.users.id, userId));
}

/** The latest point events for the shop page. */
export async function recentEvents(userId: string, limit = 12) {
  return db.select().from(schema.pointEvents).where(eq(schema.pointEvents.userId, userId)).orderBy(dsql`${schema.pointEvents.createdAt} desc`).limit(limit);
}
