import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getTeams, getRosters, getCoachesForTeams, GROUP_RAW } from './data';
import { token as newToken } from './request';
import { positionGroup, type PositionGroup } from '@/lib/game/attributes';
import { SLOTS, MAX_RESPINS, TEAMS_PER_GAME, slotAccepts, type Slot } from '@/lib/game/seventeen';
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
  /** Server-side draft log. One entry per revealed team, in order. The next team is revealed only after a pick. */
  picks?: { teamId: number; id: string; slot?: Slot; trait?: string }[];
}

export interface PublicPlayer { id: string; name: string; slug: string; position: string; group: PositionGroup | 'HC'; ovr: number; slots?: Slot[]; attrs?: Partial<Record<string, number>>; img?: string | null }
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

export async function createGameSession(opts: { gameType: GameType; userId?: string | null; daily?: boolean; position?: BuildPosition }) {
  const { gameType } = opts;
  const date = dailyDateET();
  const seed = opts.daily ? dailySeed(`${gameType}:${opts.position ?? ''}`, date) : newToken(12);
  const pool = await eligibleTeamPool(gameType, opts.position);
  const count = gameType === '17-0' ? TEAMS_PER_GAME : BUILD_TEAMS;
  if (pool.length < count + MAX_RESPINS) throw new Error('Not enough teams with eligible players. Has the database been seeded?');
  const { teams, reserves } = draftOrder(seed, pool, count);
  const payload: SpinPayload = { teams, reserves, respinsUsed: 0, position: opts.position };
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

export function slotsFor(group: PositionGroup | 'HC'): Slot[] {
  return SLOTS.filter((s) => slotAccepts(s, group));
}

/** Team cards for the client: names, positions and OVR only. Raw attributes stay server-side. */
export async function publicTeams(teamIds: number[], gameType: GameType, position?: BuildPosition): Promise<PublicTeam[]> {
  const [teams, players, coaches] = await Promise.all([getTeams(), getRosters(teamIds), gameType === '17-0' ? getCoachesForTeams(teamIds) : Promise.resolve([])]);
  const allowed = position ? new Set(BUILD_ELIGIBLE[position]) : null;
  return teamIds.map((id) => {
    const t = teams.find((x) => x.id === id)!;
    const list: PublicPlayer[] = players.filter((p) => p.teamId === id).map((p) => {
      const group = positionGroup(p.position);
      const attrs = position ? Object.fromEntries(BUILD_CATEGORIES[position].map((k) => [k, (p.attributes as Record<string, number>)[k] ?? 50])) : undefined;
      return { id: p.id, name: p.fullName, slug: p.slug, position: p.position, group, ovr: p.overallRating, slots: slotsFor(group), attrs, img: p.imageBlobUrl ?? p.imageUrl };
    }).filter((p) => (allowed ? allowed.has(p.group) : p.slots!.length > 0));
    for (const c of coaches.filter((c) => c.teamId === id)) {
      list.push({ id: `coach:${c.id}`, name: c.fullName, slug: c.slug, position: 'HC', group: 'HC', ovr: c.coachImpactScore, slots: ['HC'], img: c.imageUrl });
    }
    return { id, name: t.name, city: t.city, abbreviation: t.abbreviation, slug: t.slug, color: t.primaryColor, logoUrl: t.logoUrl, players: list };
  });
}

/** Today's six 17-0 teams, identical to what the daily spin will deal. Public by design: it's a shared puzzle. */
export async function dailyTeamsPreview() {
  const date = dailyDateET();
  const teams = await getTeams();
  const ids = teams.map((t) => t.id).sort((a, b) => a - b);
  const order = createRng(`spin:${dailySeed('17-0:', date)}`).shuffle(ids).slice(0, TEAMS_PER_GAME);
  return { date, teams: order.map((id) => teams.find((t) => t.id === id)!) };
}
