import { and, desc, eq, gt, lte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { DROP_WINDOW_MS, planDrop } from '@/lib/drops';
import { createRng } from '@/lib/game/prng';
import { SHOP_ITEMS, shopItem } from '@/lib/shop';
import { getRedis } from './redis';
import { notify } from './notifications';
import { isOwnerEmail } from '@/lib/cosmetics';

/** Items that come from drops and nowhere else. */
export const dropPool = () => SHOP_ITEMS.filter((i) => i.dropOnly).map((i) => i.key);

export class DropError extends Error { constructor(message: string, public status = 400) { super(message); } }

/** Set in Redis to pause drops (nothing new is planned or announced). Toggled from the owner page. */
export const DROPS_OFF_KEY = 'drops:off';
const paused = async () => { try { return !!(await getRedis().get(DROPS_OFF_KEY)); } catch { return false; } };

export interface LiveDrop { id: string; itemKey: string; startsAt: string; endsAt: string }

let cache: { at: number; drop: LiveDrop | null } | null = null;
/** The drop that can be claimed right now, if any. Cached for ten seconds per web instance: every open tab asks. */
export async function activeDrop(): Promise<LiveDrop | null> {
  if (cache && Date.now() - cache.at < 10_000) return cache.drop;
  const [d] = await db.select().from(schema.drops).where(and(lte(schema.drops.startsAt, dsql`now()`), gt(schema.drops.endsAt, dsql`now()`))).orderBy(desc(schema.drops.startsAt)).limit(1);
  const drop = d ? { id: d.id, itemKey: d.itemKey, startsAt: d.startsAt.toISOString(), endsAt: d.endsAt.toISOString() } : null;
  cache = { at: Date.now(), drop };
  return drop;
}
export const forgetActiveDrop = () => { cache = null; };

/** Claims the live drop for a player. One transaction: the window is checked on the database clock, and the claim key stops repeats. */
export async function claimDrop(userId: string, email: string | null | undefined, dropId: string): Promise<{ itemKey: string }> {
  if (isOwnerEmail(email)) throw new DropError('You already own everything in the shop.', 409);
  return db.transaction(async (tx) => {
    const [d] = await tx.select().from(schema.drops).where(and(eq(schema.drops.id, dropId), lte(schema.drops.startsAt, dsql`now()`), gt(schema.drops.endsAt, dsql`now()`))).limit(1);
    if (!d) throw new DropError('That drop is over. The next one comes without warning.', 410);
    const [have] = await tx.select().from(schema.userItems).where(and(eq(schema.userItems.userId, userId), eq(schema.userItems.itemKey, d.itemKey))).limit(1);
    if (have) throw new DropError('You already have this one.', 409);
    const claimed = await tx.insert(schema.dropClaims).values({ dropId, userId }).onConflictDoNothing().returning({ id: schema.dropClaims.dropId });
    if (!claimed.length) throw new DropError('You already claimed this one.', 409);
    await tx.insert(schema.userItems).values({ userId, itemKey: d.itemKey, pricePaid: 0 }).onConflictDoNothing();
    return { itemKey: d.itemKey };
  });
}

/** Starts a drop now (the owner button, and tests). */
export async function dropNow(itemKey?: string): Promise<LiveDrop> {
  const pool = dropPool();
  const key = itemKey ?? pool[Math.floor(Math.random() * pool.length)];
  if (!pool.includes(key)) throw new DropError('That is not a drop item.', 400);
  const startsAt = new Date(), endsAt = new Date(startsAt.getTime() + DROP_WINDOW_MS);
  const [row] = await db.insert(schema.drops).values({ itemKey: key, startsAt, endsAt }).returning();
  forgetActiveDrop();
  return { id: row.id, itemKey: row.itemKey, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() };
}

/** Plans the next drop when nothing is scheduled or live. */
export async function ensureScheduled(now = new Date()): Promise<boolean> {
  const pool = dropPool();
  if (!pool.length) return false;
  const [open] = await db.select({ id: schema.drops.id }).from(schema.drops).where(gt(schema.drops.endsAt, dsql`now()`)).limit(1);
  if (open) return false;
  const [last] = await db.select().from(schema.drops).orderBy(desc(schema.drops.startsAt)).limit(1);
  const after = last && last.startsAt > now ? last.startsAt : now;
  const plan = planDrop(after, createRng(`drop:${now.toISOString()}`), pool, last?.itemKey, !last);
  await db.insert(schema.drops).values({ itemKey: plan.itemKey, startsAt: plan.startsAt, endsAt: new Date(plan.startsAt.getTime() + DROP_WINDOW_MS) });
  console.log('[drops] planned', plan.itemKey, plan.startsAt.toISOString());
  return true;
}

/** Tells everyone a live drop has started: one bell notification each, skipping players who already have the item. Runs once per drop. */
export async function announceDue(): Promise<number> {
  const due = await db.update(schema.drops).set({ announcedAt: new Date() })
    .where(and(lte(schema.drops.startsAt, dsql`now()`), gt(schema.drops.endsAt, dsql`now()`), dsql`${schema.drops.announcedAt} is null`)).returning();
  forgetActiveDrop();
  let sent = 0;
  for (const d of due) {
    const item = shopItem(d.itemKey);
    const title = `Free drop: ${item?.label ?? 'a new item'}`;
    const res = await db.execute(dsql`
      insert into notifications (user_id, kind, ref, title, body, href)
      select u.id, 'drop', ${d.id}, ${title}, 'Claim it in the next 10 minutes. It is not sold anywhere.', '/shop#drops'
      from user_accounts u
      where not exists (select 1 from user_items i where i.user_id = u.id and i.item_key = ${d.itemKey})
      on conflict do nothing`);
    sent += res.count ?? 0;
    console.log('[drops] live', d.itemKey, 'notified', res.count ?? 0);
  }
  return sent;
}

/** One pass of the worker's drop clock, run every half minute. */
export async function dropsTick(): Promise<void> {
  if (await paused()) return;
  await announceDue();
  await ensureScheduled();
}

/** For the owner page: what is live, what is next, and how the last few went. */
export async function dropsOverview() {
  const [upcoming, recent] = await Promise.all([
    db.select().from(schema.drops).where(gt(schema.drops.endsAt, dsql`now()`)).orderBy(schema.drops.startsAt).limit(2),
    db.execute<{ id: string; item_key: string; starts_at: Date; claims: number }>(dsql`
      select d.id, d.item_key, d.starts_at, (select count(*)::int from drop_claims c where c.drop_id = d.id) as claims
      from drops d where d.ends_at <= now() order by d.starts_at desc limit 5`),
  ]);
  return {
    upcoming: upcoming.map((d) => ({ id: d.id, itemKey: d.itemKey, startsAt: d.startsAt.toISOString(), endsAt: d.endsAt.toISOString() })),
    recent: [...recent].map((r) => ({ id: r.id, itemKey: r.item_key, startsAt: new Date(r.starts_at).toISOString(), claims: r.claims })),
    paused: await paused(),
  };
}

export { notify };
