import { and, asc, desc, eq, ilike, inArray, isNotNull, max, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { cached } from './redis';
import { positionGroup, type PositionGroup } from '@/lib/game/attributes';

const DAY = 86400;

export type PlayerRow = typeof schema.players.$inferSelect;
export type TeamRow = typeof schema.teams.$inferSelect;
export type CoachRow = typeof schema.coaches.$inferSelect;

export const getTeams = () => cached('teams:all', DAY, () => db.select().from(schema.teams).orderBy(asc(schema.teams.city)));

export async function getTeamBySlug(slug: string) {
  const [t] = await db.select().from(schema.teams).where(eq(schema.teams.slug, slug)).limit(1);
  return t ?? null;
}

export async function getPlayerBySlug(slug: string) {
  return cached(`player:${slug}`, 300, async () => {
    const [p] = await db.select().from(schema.players).where(eq(schema.players.slug, slug)).limit(1);
    return p ?? null;
  });
}

export const playerGroup = (p: Pick<PlayerRow, 'position'>): PositionGroup => positionGroup(p.position);

export function getRoster(teamId: number) {
  return cached(`roster:${teamId}`, 300, () =>
    db.select().from(schema.players).where(and(eq(schema.players.teamId, teamId), eq(schema.players.isActive, true))).orderBy(desc(schema.players.overallRating)));
}

export async function getRosters(teamIds: number[]) {
  if (!teamIds.length) return [];
  return db.select().from(schema.players).where(and(inArray(schema.players.teamId, teamIds), eq(schema.players.isActive, true))).orderBy(desc(schema.players.overallRating));
}

export async function getCoachesForTeams(teamIds: number[]) {
  if (!teamIds.length) return [];
  return db.select().from(schema.coaches).where(inArray(schema.coaches.teamId, teamIds));
}

export async function getCoachBySlug(slug: string) {
  const [c] = await db.select().from(schema.coaches).where(eq(schema.coaches.slug, slug)).limit(1);
  return c ?? null;
}

export const getAllCoaches = () => cached('coaches:all', DAY, () => db.select().from(schema.coaches).orderBy(desc(schema.coaches.coachImpactScore)));

export async function getPlayersByPositions(raw: string[], limit = 100) {
  return db.select().from(schema.players).where(and(inArray(schema.players.position, raw), eq(schema.players.isActive, true))).orderBy(desc(schema.players.overallRating)).limit(limit);
}

export async function searchPlayers(q: string, limit = 10) {
  return db.select({ slug: schema.players.slug, fullName: schema.players.fullName, position: schema.players.position, overallRating: schema.players.overallRating, teamId: schema.players.teamId, imageBlobUrl: schema.players.imageBlobUrl, imageUrl: schema.players.imageUrl, espnId: schema.players.espnId })
    .from(schema.players).where(ilike(schema.players.fullName, `%${q.replace(/[%_]/g, '')}%`)).orderBy(desc(schema.players.overallRating)).limit(limit);
}

export async function getAllPlayerSlugs() {
  return db.select({ slug: schema.players.slug, lastSyncedAt: schema.players.lastSyncedAt }).from(schema.players);
}

export async function getLastSync(): Promise<Date | null> {
  const [r] = await db.select({ at: max(schema.players.lastSyncedAt) }).from(schema.players);
  return r?.at ?? null;
}

export async function getTopPlayers(limit = 50) {
  return db.select().from(schema.players).where(eq(schema.players.isActive, true)).orderBy(desc(schema.players.overallRating), asc(schema.players.lastName)).limit(limit);
}

export async function countPlayers() {
  const [r] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.players);
  return r?.n ?? 0;
}

/** Raw feed positions that belong to a site position group. */
export const GROUP_RAW: Record<PositionGroup, string[]> = {
  QB: ['QB'], RB: ['HB', 'FB', 'RB'], WR: ['WR'], TE: ['TE'], OL: ['LT', 'LG', 'C', 'RG', 'RT'],
  DL: ['DT'], EDGE: ['LE', 'RE', 'LEDG', 'REDG'], LB: ['LOLB', 'MLB', 'ROLB', 'SAM', 'MIKE', 'WILL'], CB: ['CB'], S: ['FS', 'SS'], K: ['K', 'P'],
};

let ceilingCache: { at: number; v: Record<string, number> } | null = null;
/**
 * The best current grade at each position, league-wide, for 17-0's scarcity rescale. The top three are averaged so
 * one outlier rating does not set the bar. Cached ten minutes; ratings change once a day.
 */
export async function groupCeilings(): Promise<Record<string, number>> {
  if (ceilingCache && Date.now() - ceilingCache.at < 10 * 60_000) return ceilingCache.v;
  const { ratePlayer } = await import('@/lib/game/formulas');
  const rows = await db.select({ position: schema.players.position, attributes: schema.players.attributes }).from(schema.players)
    .where(and(eq(schema.players.isActive, true), eq(schema.players.isAllTimeGreat, false), isNotNull(schema.players.teamId)));
  const by = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.attributes) continue;
    const g = positionGroup(r.position);
    by.set(g, [...(by.get(g) ?? []), ratePlayer(r.attributes as never, g)]);
  }
  const v = Object.fromEntries([...by].map(([g, xs]) => { const top = xs.sort((a, b) => b - a).slice(0, 3); return [g, Math.round((top.reduce((s, x) => s + x, 0) / top.length) * 10) / 10]; }));
  ceilingCache = { at: Date.now(), v };
  return v;
}
