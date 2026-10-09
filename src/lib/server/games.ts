import { createHash } from 'node:crypto';
import { and, eq, inArray, isNotNull, or, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getTeams, getRosters, getCoachesForTeams, GROUP_RAW } from './data';
import { token as newToken } from './request';
import { getRedis } from './redis';
import { positionGroup, type PositionGroup } from '@/lib/game/attributes';
import { FORMATS, MAX_RESPINS, boardOrder, isFantasy, respinsFor, slotsFor as formatSlots, type FormatKey, type PoolKey } from '@/lib/game/seventeen';
import { fantasyValue } from '@/lib/game/fantasy';
import { LEGEND_FRANCHISE } from '@/lib/game/legends';
import { BUILD_CATEGORIES, BUILD_ELIGIBLE, BUILD_TEAMS, type BuildPosition } from '@/lib/game/build';
import { createRng } from '@/lib/game/prng';
import { dailyDateET, dailySeed } from '@/lib/game/daily';

export type GameType = '17-0' | 'build-a-player';
export const GAME_TYPES: GameType[] = ['17-0', 'build-a-player'];
export const isGameType = (t: string): t is GameType => (GAME_TYPES as string[]).includes(t);

export interface SpinPayload {
  teams: number[];
  reserves: number[];
  respinsUsed: number;
  position?: BuildPosition;
  /** Hard mode: search players by name, overall ratings hidden until the result, no re-rolls. */
  hard?: boolean;
  /** 17-0 roster size (default 6) and player pool (default current). Today is always 6 and current. */
  format?: FormatKey;
  pool?: PoolKey;
  /** Server-side draft log. One entry per revealed team, in order. The next team is revealed only after a pick. */
  picks?: { teamId: number; id: string; slot?: string; trait?: string }[];
  /** Set when this game is someone's challenge: same seed, same setup, graded from the roster (see challenges.ts). */
  challengeId?: string;
}

export interface PublicPlayer { id: string; name: string; slug: string; position: string; group: PositionGroup | 'HC'; ovr: number; slots?: string[]; attrs?: Partial<Record<string, number>>; img?: string | null; legend?: boolean; /** All-time legend from ESPN history: his best season with this franchise, e.g. "1994 · 112 rec, 1,499 yds, 13 TD". */ line?: string; /** Fantasy edition: blended PPR points per game. */ fpts?: number }
export interface PublicTeam { id: number; name: string; city: string; abbreviation: string; slug: string; color: string; logoUrl: string | null; players: PublicPlayer[] }

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

function draftOrder(seed: string, pool: number[], count: number) {
  const order = createRng(`spin:${seed}`).shuffle([...pool].sort((a, b) => a - b));
  return { teams: order.slice(0, count), reserves: order.slice(count, count + MAX_RESPINS) };
}

async function eligibleTeamPool(gameType: GameType, position?: BuildPosition): Promise<number[]> {
  const teams = await getTeams();
  if (gameType === '17-0') return teams.map((t) => t.id);
  const raws = BUILD_ELIGIBLE[position!].flatMap((g) => GROUP_RAW[g as PositionGroup]);
  const rows = await db.selectDistinct({ teamId: schema.players.teamId }).from(schema.players)
    .where(and(eq(schema.players.isActive, true), inArray(schema.players.position, raws)));
  return rows.map((r) => r.teamId).filter((x): x is number => x !== null);
}

export async function createGameSession(opts: { gameType: GameType; userId?: string | null; daily?: boolean; position?: BuildPosition; hard?: boolean; format?: FormatKey; pool?: PoolKey; challenge?: { seed: string; challengeId: string } }) {
  const { gameType } = opts;
  const date = dailyDateET();
  const seed = opts.daily ? dailySeed(`${gameType}:${opts.position ?? ''}`, date) : opts.challenge?.seed ?? newToken(12);
  const pool = await eligibleTeamPool(gameType, opts.position);
  // Today is one shared puzzle: the classic six from current rosters. Size and pool are Casual choices.
  const format: FormatKey = gameType === '17-0' && !opts.daily ? opts.format ?? '6' : '6';
  // Fantasy points exist only for current players.
  const playerPool: PoolKey = gameType === '17-0' && !opts.daily && !isFantasy(format) ? opts.pool ?? 'current' : 'current';
  const count = gameType === '17-0' ? FORMATS[format].slots.length : BUILD_TEAMS;
  const repeat = gameType === '17-0' && FORMATS[format].repeatTeams;
  if (repeat ? pool.length < 8 : pool.length < count + (gameType === '17-0' ? respinsFor(format) : MAX_RESPINS)) throw new Error('Not enough teams with eligible players. Has the database been seeded?');
  const { teams, reserves } = gameType === '17-0' ? boardOrder(seed, pool, format) : draftOrder(seed, pool, count);
  const payload: SpinPayload = { teams, reserves, respinsUsed: 0, position: opts.position, hard: !!opts.hard, ...(gameType === '17-0' ? { format, pool: playerPool } : {}), ...(opts.challenge && !opts.daily ? { challengeId: opts.challenge.challengeId } : {}) };
  const tok = newToken();
  const [row] = await db.insert(schema.gameSessions).values({
    userId: opts.userId ?? null, gameType, seed, spinPayload: payload, token: hashToken(tok),
    isDaily: !!opts.daily, dailyDate: opts.daily ? date : null, expiresAt: new Date(Date.now() + 6 * 3600_000),
  }).returning();
  return { session: row, token: tok, payload };
}

export async function loadSession(id: string, tok: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !tok) return null;
  const [row] = await db.select().from(schema.gameSessions).where(eq(schema.gameSessions.id, id)).limit(1);
  if (!row || row.token !== hashToken(tok)) return null;
  return row;
}

/** Each franchise's graded legends from ESPN's NFL history (see nfl-history.ts), cached for an hour. */
export type HistLegend = typeof schema.nflLegends.$inferSelect;
async function historyLegendsByTeam(): Promise<Map<number, HistLegend[]>> {
  const r = getRedis();
  const cached = await r.get('legends:by-team').catch(() => null);
  const rows: HistLegend[] = cached ? JSON.parse(cached) : await db.select().from(schema.nflLegends);
  if (!cached && rows.length) await r.set('legends:by-team', JSON.stringify(rows), 'EX', 3600).catch(() => {});
  const out = new Map<number, HistLegend[]>();
  for (const l of rows) out.set(l.teamId, [...(out.get(l.teamId) ?? []), l]);
  for (const list of out.values()) list.sort((a, b) => b.grade - a.grade);
  return out;
}

/** All-time greats, active and teamless, keyed by the franchise they belong to in All-time mode. */
async function legendsByTeam(): Promise<Map<number, (typeof schema.players.$inferSelect)[]>> {
  const [teams, rows] = await Promise.all([getTeams(), db.select().from(schema.players).where(and(eq(schema.players.isAllTimeGreat, true), eq(schema.players.isActive, true)))]);
  const out = new Map<number, (typeof schema.players.$inferSelect)[]>();
  for (const r of rows) {
    const t = teams.find((x) => x.abbreviation === LEGEND_FRANCHISE[r.slug]);
    if (t) out.set(t.id, [...(out.get(t.id) ?? []), r]);
  }
  return out;
}

/** Team cards for the client: names, positions and OVR only. Raw attributes stay server-side. */
export async function publicTeams(teamIds: number[], gameType: GameType, position?: BuildPosition, opts: { format?: FormatKey; pool?: PoolKey } = {}): Promise<PublicTeam[]> {
  const format = opts.format ?? '6';
  const slotsFor = (g: PositionGroup | 'HC') => formatSlots(g, format);
  const fantasy = gameType === '17-0' && isFantasy(format);
  const allTime = gameType === '17-0' && opts.pool === 'all-time' && !fantasy;
  const [teams, players, coaches, legends, history] = await Promise.all([getTeams(), getRosters(teamIds), gameType === '17-0' && !fantasy ? getCoachesForTeams(teamIds) : Promise.resolve([]),
    allTime ? legendsByTeam() : Promise.resolve(new Map<number, never[]>()), allTime ? historyLegendsByTeam() : Promise.resolve(new Map<number, HistLegend[]>())]);
  const allowed = position ? new Set(BUILD_ELIGIBLE[position]) : null;
  return teamIds.map((id) => {
    const t = teams.find((x) => x.id === id)!;
    const list: PublicPlayer[] = [...(legends.get(id) ?? []), ...players.filter((p) => p.teamId === id)].map((p) => {
      const group = positionGroup(p.position);
      const attrs = position ? Object.fromEntries(BUILD_CATEGORIES[position].map((k) => [k, (p.attributes as Record<string, number>)[k] ?? 50])) : undefined;
      return { id: p.id, name: p.fullName, slug: p.slug, position: p.position, group, ovr: p.overallRating, slots: slotsFor(group), attrs, img: p.imageBlobUrl ?? p.imageUrl, ...(p.isAllTimeGreat ? { legend: true } : {}), ...(fantasy ? { fpts: fantasyValue(p.fantasyPpg, p.fantasyGames, p.fantasyProjPpg, p.fantasyRecent) } : {}) };
    }).filter((p) => (allowed ? allowed.has(p.group) : p.slots!.length > 0));
    // History legends go right after the Madden legends, best first.
    const hist: PublicPlayer[] = (history.get(id) ?? []).map((l) => {
      const group = l.group as PositionGroup;
      return { id: l.id, name: l.fullName, slug: '', position: l.position, group, ovr: Math.round(l.grade), slots: slotsFor(group), img: l.headshot, legend: true, line: `${l.season} · ${l.line}` };
    }).filter((p) => p.slots!.length > 0);
    list.splice((legends.get(id) ?? []).length, 0, ...hist);
    // Fantasy boards list by points, best first.
    if (fantasy) list.sort((a, b) => (b.fpts ?? 0) - (a.fpts ?? 0));
    for (const c of coaches.filter((c) => c.teamId === id)) {
      list.push({ id: `coach:${c.id}`, name: c.fullName, slug: c.slug, position: 'HC', group: 'HC', ovr: c.coachImpactScore, slots: ['HC'], img: c.imageUrl });
    }
    return { id, name: t.name, city: t.city, abbreviation: t.abbreviation, slug: t.slug, color: t.primaryColor, logoUrl: t.logoUrl, players: list };
  });
}

/** The id of this user's ranked result for today, if they already played. */
export async function todaysResult(userId: string, gameType: string): Promise<string | null> {
  const [r] = await db.select({ id: schema.gameResults.id }).from(schema.gameResults)
    .where(and(eq(schema.gameResults.userId, userId), eq(schema.gameResults.gameType, gameType), eq(schema.gameResults.isDaily, true), eq(schema.gameResults.dailyDate, dailyDateET()))).limit(1);
  return r?.id ?? null;
}

let fantasyCache: { at: number; ready: boolean } | null = null;
/** Fantasy needs Sleeper points on enough players to fill a board. */
export async function fantasyReady(): Promise<boolean> {
  if (fantasyCache && Date.now() - fantasyCache.at < 300_000) return fantasyCache.ready;
  const [r] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.players)
    .where(and(eq(schema.players.isActive, true), or(isNotNull(schema.players.fantasyPpg), isNotNull(schema.players.fantasyProjPpg))));
  const ready = (r?.n ?? 0) >= 150;
  // Only a yes is cached, so the edition opens as soon as the first sync lands.
  if (ready) fantasyCache = { at: Date.now(), ready };
  return ready;
}
