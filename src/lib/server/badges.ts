import { eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { GAMES } from '@/lib/game-registry';
import { EARN, grant } from './points';
import { notify } from './notifications';
import { getPlayDates } from './account';
import { getRedis } from './redis';
import { longestStreak } from '@/lib/game/daily';
import { BADGES_LAUNCH, EARLY_ADOPTER_BEFORE, KONAMI, NO_FACTS, PUZZLES, badgeByKey, badgePoints, earnedBadges, type Badge, type BadgeFacts } from '@/lib/badges';
import { resultFacts, type DayRow, type HourRow, type ResultGroup } from '@/lib/badge-facts';

/** A row with this key means the player's first sync is done. */
const BASELINE = '_baseline';
/** The draft games' own "perfect": every game won. */
const SEASON_PERFECT = dsql`((game_type = '17-0' and (result_data->>'wins')::int = 17) or (game_type = '82-0' and (result_data->>'wins')::int = 82) or (game_type = '162-0' and (result_data->>'wins')::int = 162))`;
const ANY_PERFECT = dsql`(${SEASON_PERFECT} or (result_data->>'perfect') = 'true' or (game_type = 'build-a-player' and (result_data->>'rating')::float >= 97))`;
const ET = dsql`'America/New_York'`;

/** Gathers everything achievements are earned from: results (in three small summaries), points, the shop, drops, Pick 'em, challenges, the account. */
export async function badgeFacts(userId: string): Promise<BadgeFacts> {
  const puzzleList = dsql.join(PUZZLES.map((p) => dsql`${p}`), dsql`, `);
  const [groups, hours, days, events, [u], [items], [drops], [pick], [made], [plays], [takers], secrets, dates] = await Promise.all([
    db.execute<ResultGroup>(dsql`
      select game_type as game, is_daily as daily, coalesce((result_data->>'hard')::boolean, false) as hard,
        coalesce(result_data->>'format', '') as format, coalesce(result_data->>'pool', '') as pool,
        case when game_type in ('17-0', '82-0', '162-0') then (result_data->>'wins')::int end as wins,
        coalesce((result_data->>'perfect') = 'true' or (game_type = 'build-a-player' and (result_data->>'rating')::float >= 97), false) as flag,
        count(*)::int as n
      from game_results where user_id = ${userId} and not flagged group by 1, 2, 3, 4, 5, 6, 7`),
    db.execute<HourRow>(dsql`
      select extract(hour from created_at at time zone ${ET})::int as h, extract(minute from created_at at time zone ${ET})::int as m, count(*)::int as n
      from game_results where user_id = ${userId} and not flagged group by 1, 2`),
    db.execute<{ date: string; n: number; types: number; perfect: number; season_perfect: number; puzzle_perfect: number }>(dsql`
      select (created_at at time zone ${ET})::date::text as date, count(*)::int as n, count(distinct game_type)::int as types,
        count(*) filter (where ${ANY_PERFECT})::int as perfect, count(*) filter (where ${SEASON_PERFECT})::int as season_perfect,
        count(*) filter (where game_type in (${puzzleList}) and (result_data->>'perfect') = 'true')::int as puzzle_perfect
      from game_results where user_id = ${userId} and not flagged group by 1`),
    db.execute<{ reason: string; best: number; n: number; total: number }>(dsql`
      select reason, max(amount)::int as best, count(*)::int as n, coalesce(sum(amount), 0)::int as total from point_events
      where user_id = ${userId} and reason in ('board', 'week', 'pickem-week', 'challenge-win', 'buy') group by reason`),
    db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
    db.execute<{ n: number }>(dsql`select count(*)::int as n from user_items where user_id = ${userId}`),
    db.execute<{ n: number; sniped: boolean }>(dsql`
      select count(*)::int as n, coalesce(bool_or(c.claimed_at - d.starts_at < interval '30 seconds'), false) as sniped
      from drop_claims c join drops d on d.id = c.drop_id where c.user_id = ${userId}`),
    db.execute<{ picks: number; right: number }>(dsql`
      select count(*)::int as picks, count(*) filter (where g.winner is not null and p.pick = g.winner)::int as right
      from pickem_picks p join pickem_games g on g.id = p.game_id where p.user_id = ${userId}`),
    db.execute<{ n: number }>(dsql`select count(*)::int as n from challenges where creator_id = ${userId}`),
    db.execute<{ n: number }>(dsql`select count(*)::int as n from challenge_entries where user_id = ${userId}`),
    db.execute<{ n: number }>(dsql`select count(*)::int as n from challenge_entries e join challenges c on c.id = e.challenge_id where c.creator_id = ${userId} and e.user_id is distinct from ${userId}`),
    db.select({ k: schema.userBadges.badgeKey }).from(schema.userBadges).where(eq(schema.userBadges.userId, userId)),
    getPlayDates(userId),
  ]);
  const ev = new Map([...events].map((e) => [e.reason, e]));
  const sportOf = new Map(GAMES.map((g) => [g.slug, g.sport]));
  const rs = resultFacts([...groups], [...hours], [...days].map((d): DayRow => ({ date: d.date, n: d.n, types: d.types, perfect: d.perfect, seasonPerfect: d.season_perfect, puzzlePerfect: d.puzzle_perfect })));
  const board = ev.get('board');
  const worn = [u?.nameFont && u.nameFont !== 'classic', u?.nameColor && u.nameColor !== 'ink', u?.equipBorder, u?.equipBanner, u?.equipTitle, u?.equipFlair, u?.equipEffect].filter(Boolean).length;
  return {
    ...NO_FACTS, ...rs,
    sports: [...new Set([...groups].map((r) => sportOf.get(r.game)).filter((s): s is NonNullable<typeof s> => !!s))],
    longestStreak: longestStreak(dates),
    // Daily board points fall with rank (EARN.board), so the biggest one paid tells the best finish.
    boardBest: board ? EARN.board.indexOf(board.best) + 1 || null : null,
    weekWins: ev.get('week')?.best === EARN.week[0] ? 1 : 0,
    pickemPerfectWeeks: ev.get('pickem-week')?.n ?? 0,
    challengeWins: ev.get('challenge-win')?.n ?? 0,
    pointsEarned: u?.pointsEarned ?? 0,
    pickemPicks: pick?.picks ?? 0, pickemRight: pick?.right ?? 0,
    challengesMade: made?.n ?? 0, challengePlays: plays?.n ?? 0, challengeTakers: takers?.n ?? 0,
    itemsOwned: items?.n ?? 0, slotsWorn: worn, pointsSpent: -(ev.get('buy')?.total ?? 0), dropsClaimed: drops?.n ?? 0, dropSniped: !!drops?.sniped,
    accountDays: u ? Math.floor((Date.now() - u.createdAt.getTime()) / 86_400_000) : 0,
    joinedEarly: !!u && u.createdAt.getTime() < Date.parse(EARLY_ADOPTER_BEFORE),
    hasAvatar: !!u?.image,
    secrets: secrets.map((s) => s.k).filter((k) => k === KONAMI),
  };
}

export const badgesFor = async (userId: string) => earnedBadges(await badgeFacts(userId));

/**
 * Brings a player's stored achievements up to date: records what is newly earned, and for each one sends a bell
 * notification and pays its points once. A player whose account predates achievements gets a silent first sync, so
 * nothing they had already earned is announced or paid. Returns the keys announced and everything earned.
 */
export async function syncBadges(userId: string): Promise<{ announced: string[]; earned: Badge[] }> {
  const [facts, stored, [u]] = await Promise.all([
    badgeFacts(userId),
    db.select({ k: schema.userBadges.badgeKey }).from(schema.userBadges).where(eq(schema.userBadges.userId, userId)),
    db.select({ createdAt: schema.users.createdAt }).from(schema.users).where(eq(schema.users.id, userId)).limit(1),
  ]);
  const earned = earnedBadges(facts);
  if (!u) return { announced: [], earned };
  const have = new Set(stored.map((r) => r.k));
  const legacy = u.createdAt.getTime() < Date.parse(BADGES_LAUNCH);
  const silent = legacy && !have.has(BASELINE);
  const fresh = earned.map((b) => b.key).filter((k) => !have.has(k));
  const rows = [...fresh.map((badgeKey) => ({ userId, badgeKey })), ...(!have.has(BASELINE) ? [{ userId, badgeKey: BASELINE }] : [])];
  if (!rows.length) return { announced: [], earned };
  const inserted = await db.insert(schema.userBadges).values(rows).onConflictDoNothing().returning({ k: schema.userBadges.badgeKey });
  if (silent) return { announced: [], earned };
  const announced: string[] = [];
  for (const { k } of inserted) {
    const bd = badgeByKey(k);
    if (!bd) continue;
    const pts = badgePoints(bd);
    if (pts > 0) await grant(userId, pts, 'badge', k).catch(() => false);
    await notify(userId, 'badge', k, `Achievement unlocked: ${bd.label}`, `${bd.desc}${pts ? `. +${pts} points` : ''}`, '/profile#badges');
    announced.push(k);
  }
  return { announced, earned };
}

/** Fire and forget after something a player did, at most one sync every few seconds per player. A profile visit catches up anything skipped. */
export async function queueBadgeSync(userId: string): Promise<void> {
  try {
    const ok = await getRedis().set(`badges:sync:${userId}`, '1', 'EX', 4, 'NX');
    if (!ok) return;
    await syncBadges(userId);
  } catch (e) { console.warn('[badges] sync failed', (e as Error).message); }
}

/** A code entered by a player (the Konami code): recorded once, announced once, paid nothing. */
export async function recordSecret(userId: string, code: string): Promise<boolean> {
  if (code !== KONAMI) return false;
  const [row] = await db.insert(schema.userBadges).values({ userId, badgeKey: KONAMI }).onConflictDoNothing().returning({ k: schema.userBadges.badgeKey });
  if (!row) return false;
  const bd = badgeByKey(KONAMI)!;
  await notify(userId, 'badge', KONAMI, `Achievement unlocked: ${bd.label}`, bd.desc, '/profile#badges');
  return true;
}
