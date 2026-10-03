import { and, asc, eq, inArray, isNotNull, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { grant } from './points';

/**
 * Pick 'em: every NFL game of the week from ESPN's public scoreboard, synced by the worker. Players pick a
 * winner per game until kickoff (checked here, on the server, against the stored kickoff time). When a game is
 * final, everyone who picked the winner earns points once (the points ledger is idempotent by game id), and a
 * player who got every game of a finished week right earns the perfect-week bonus.
 */
const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
export const PICKEM_POINTS = { correct: 10, perfectWeek: 50 };

type Json = Record<string, any>;

/** Turns one scoreboard response into game rows. Exported for tests. */
export function parseScoreboard(j: Json): (typeof schema.pickemGames.$inferInsert)[] {
  const season = Number(j?.season?.year), week = Number(j?.week?.number);
  if (!season || !week) return [];
  return ((j?.events ?? []) as Json[]).flatMap((e) => {
    const c = e?.competitions?.[0];
    const home = (c?.competitors ?? []).find((x: Json) => x.homeAway === 'home');
    const away = (c?.competitors ?? []).find((x: Json) => x.homeAway === 'away');
    if (!e?.id || !home || !away || !e.date) return [];
    const state = String(c?.status?.type?.state ?? e?.status?.type?.state ?? 'pre');
    const final = !!(c?.status?.type?.completed ?? e?.status?.type?.completed);
    const hs = home.score != null ? Number(home.score) : null, as = away.score != null ? Number(away.score) : null;
    const winner = !final ? null : home.winner ? 'home' : away.winner ? 'away' : hs != null && as != null && hs === as ? 'tie' : null;
    return [{
      id: String(e.id), season, week, kickoff: new Date(e.date),
      homeAbbr: String(home.team?.abbreviation ?? ''), awayAbbr: String(away.team?.abbreviation ?? ''),
      homeName: String(home.team?.displayName ?? home.team?.name ?? ''), awayName: String(away.team?.displayName ?? away.team?.name ?? ''),
      homeLogo: home.team?.logo ?? null, awayLogo: away.team?.logo ?? null,
      homeScore: state === 'pre' ? null : hs, awayScore: state === 'pre' ? null : as,
      winner, status: final ? 'post' : state, updatedAt: new Date(),
    }];
  });
}

/** Syncs this week (and next, so picks open early), then pays out finished games. */
export async function syncPickem(fetchImpl: typeof fetch = fetch) {
  const r = await fetchImpl(SCOREBOARD, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`scoreboard HTTP ${r.status}`);
  const cur = await r.json();
  let rows = parseScoreboard(cur);
  const next = Number(cur?.week?.number) + 1;
  const seasonType = Number(cur?.season?.type ?? 2);
  if (next && seasonType === 2) {
    const n = await fetchImpl(`${SCOREBOARD}?week=${next}&seasontype=2`, { signal: AbortSignal.timeout(20_000) }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (n) rows = rows.concat(parseScoreboard(n));
  }
  for (const g of rows) {
    await db.insert(schema.pickemGames).values(g).onConflictDoUpdate({ target: schema.pickemGames.id, set: { ...g, id: undefined } });
  }
  const paid = await settle();
  const summary = { games: rows.length, week: cur?.week?.number, paid };
  console.log('[pickem] synced', JSON.stringify(summary));
  return summary;
}

type GameRow = { id: string; season: number; week: number; status: string; winner: string | null };
type PickRow = { userId: string; gameId: string; pick: string };
export interface Payout { userId: string; amount: number; reason: 'pickem' | 'pickem-week'; ref: string }

/**
 * Who is owed what: +10 per correct pick on a final game, +50 when every game of a week is final and the
 * player picked all of them right. Ties pay nothing. Pure, so the rules are unit tested.
 */
export function payouts(games: GameRow[], picks: PickRow[]): Payout[] {
  const out: Payout[] = [];
  const byId = new Map(games.map((g) => [g.id, g]));
  const weeks = new Map<string, GameRow[]>();
  for (const g of games) { const k = `${g.season}:${g.week}`; weeks.set(k, [...(weeks.get(k) ?? []), g]); }
  for (const p of picks) {
    const g = byId.get(p.gameId);
    if (g && g.status === 'post' && g.winner === p.pick) out.push({ userId: p.userId, amount: PICKEM_POINTS.correct, reason: 'pickem', ref: g.id });
  }
  for (const [k, gs] of weeks) {
    if (!gs.every((g) => g.status === 'post' && g.winner)) continue;
    const ids = new Set(gs.map((g) => g.id));
    const right = new Map<string, number>();
    for (const p of picks) if (ids.has(p.gameId) && byId.get(p.gameId)!.winner === p.pick) right.set(p.userId, (right.get(p.userId) ?? 0) + 1);
    for (const [userId, n] of right) if (n === gs.length) out.push({ userId, amount: PICKEM_POINTS.perfectWeek, reason: 'pickem-week', ref: k });
  }
  return out;
}

/** Pays everything owed. Safe to run any number of times: each grant is unique on (user, reason, ref). */
export async function settle(): Promise<number> {
  const done = await db.select({ season: schema.pickemGames.season, week: schema.pickemGames.week }).from(schema.pickemGames)
    .where(and(eq(schema.pickemGames.status, 'post'), isNotNull(schema.pickemGames.winner)));
  if (!done.length) return 0;
  const seasons = [...new Set(done.map((g) => g.season))];
  const games = await db.select().from(schema.pickemGames).where(inArray(schema.pickemGames.season, seasons));
  const picks = await db.select().from(schema.pickemPicks).where(inArray(schema.pickemPicks.gameId, games.map((g) => g.id)));
  let paid = 0;
  for (const p of payouts(games, picks)) if (await grant(p.userId, p.amount, p.reason, p.ref)) paid++;
  return paid;
}

/** The week to show: the earliest week that still has a game not final, else the latest synced week. */
export async function currentWeek(): Promise<{ season: number; week: number } | null> {
  const [open] = await db.select({ season: schema.pickemGames.season, week: schema.pickemGames.week }).from(schema.pickemGames)
    .where(dsql`${schema.pickemGames.status} <> 'post'`).orderBy(asc(schema.pickemGames.kickoff)).limit(1);
  if (open) return open;
  const [last] = await db.select({ season: schema.pickemGames.season, week: schema.pickemGames.week }).from(schema.pickemGames)
    .orderBy(dsql`${schema.pickemGames.season} desc, ${schema.pickemGames.week} desc`).limit(1);
  return last ?? null;
}

/** Picks close at kickoff (or as soon as ESPN shows the game started). */
export const isLocked = (g: { kickoff: Date; status: string }) => g.status !== 'pre' || g.kickoff.getTime() <= Date.now();

export class PickError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

/** Saves or changes a pick. Locked once the game kicks off. */
export async function savePick(userId: string, gameId: string, pick: 'home' | 'away') {
  const [g] = await db.select().from(schema.pickemGames).where(eq(schema.pickemGames.id, gameId)).limit(1);
  if (!g) throw new PickError('Unknown game.', 404);
  if (isLocked(g)) throw new PickError('That game has started. Picks are locked.', 409);
  await db.insert(schema.pickemPicks).values({ userId, gameId, pick }).onConflictDoUpdate({ target: [schema.pickemPicks.userId, schema.pickemPicks.gameId], set: { pick, createdAt: new Date() } });
}

/** Standings: correct picks per player, for one week or the whole season. */
export async function standings(season: number, week?: number, limit = 50) {
  return db.execute<{ username: string; won: number; made: number }>(dsql`
    select coalesce(u.username, 'anonymous') as username, count(*) filter (where p.pick = g.winner)::int as won, count(*) filter (where g.winner is not null)::int as made
    from pickem_picks p join pickem_games g on g.id = p.game_id join user_accounts u on u.id = p.user_id
    where g.season = ${season} ${week ? dsql`and g.week = ${week}` : dsql``} and not u.lb_hidden
    group by u.username having count(*) filter (where g.winner is not null) > 0
    order by won desc, made asc, username asc limit ${limit}`);
}
