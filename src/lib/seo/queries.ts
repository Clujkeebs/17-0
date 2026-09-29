import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { GROUP_RAW, type CoachRow, type PlayerRow, type TeamRow } from '@/lib/server/data';
import { POSITION_GROUPS, positionGroup, type AttributeKey, type PositionGroup } from '@/lib/game/attributes';
import { safe } from './safe';

// Uncached, timeout-guarded reads for ISR pages. ISR already caches the rendered HTML for a day,
// and skipping Redis here keeps the build from hanging when Redis is not reachable.

export const teamName = (t: Pick<TeamRow, 'city' | 'name'>) => (t.name.startsWith(t.city) ? t.name : `${t.city} ${t.name}`);
export const divisionLabel = (t: Pick<TeamRow, 'conference' | 'division'>) =>
  t.division.toUpperCase().startsWith(t.conference.toUpperCase()) ? t.division : `${t.conference} ${t.division}`;

export const loadTeams = () => safe(() => db.select().from(schema.teams).orderBy(asc(schema.teams.city)), [] as TeamRow[]);

export async function loadTeamMap() {
  const teams = await loadTeams();
  return new Map(teams.map((t) => [t.id, t]));
}

export const loadTeam = (slug: string) =>
  safe(async () => (await db.select().from(schema.teams).where(eq(schema.teams.slug, slug)).limit(1))[0] ?? null, null as TeamRow | null);

export const loadPlayer = (slug: string) =>
  safe(async () => (await db.select().from(schema.players).where(eq(schema.players.slug, slug)).limit(1))[0] ?? null, null as PlayerRow | null);

export const loadGroup = (g: PositionGroup, limit = 1000) =>
  safe(() => db.select().from(schema.players)
    .where(and(inArray(schema.players.position, GROUP_RAW[g]), eq(schema.players.isActive, true)))
    .orderBy(desc(schema.players.overallRating), asc(schema.players.lastName)).limit(limit), [] as PlayerRow[]);

export const loadTop = (limit = 100) =>
  safe(() => db.select().from(schema.players).where(eq(schema.players.isActive, true))
    .orderBy(desc(schema.players.overallRating), asc(schema.players.lastName)).limit(limit), [] as PlayerRow[]);

export const loadRoster = (teamId: number) =>
  safe(() => db.select().from(schema.players).where(and(eq(schema.players.teamId, teamId), eq(schema.players.isActive, true)))
    .orderBy(desc(schema.players.overallRating)), [] as PlayerRow[]);

export const loadCoaches = () => safe(() => db.select().from(schema.coaches).orderBy(desc(schema.coaches.coachImpactScore)), [] as CoachRow[]);

export const loadCoach = (slug: string) =>
  safe(async () => (await db.select().from(schema.coaches).where(eq(schema.coaches.slug, slug)).limit(1))[0] ?? null, null as CoachRow | null);

export const loadTeamCoach = (teamId: number) =>
  safe(async () => (await db.select().from(schema.coaches).where(eq(schema.coaches.teamId, teamId)).limit(1))[0] ?? null, null as CoachRow | null);

export const groupOf = (p: Pick<PlayerRow, 'position'>) => positionGroup(p.position);

/** 1-based rank of `value` in a list, ties share the better rank. */
export function rankOf(values: number[], value: number): number {
  return values.filter((v) => v > value).length + 1;
}

export function attrRank(pool: PlayerRow[], key: AttributeKey, value: number) {
  const vals = pool.map((p) => p.attributes?.[key]).filter((v): v is number => typeof v === 'number');
  return { rank: rankOf(vals, value), total: vals.length };
}

/** Players in the same group nearest in OVR, excluding the player. */
export function nearest(pool: PlayerRow[], p: PlayerRow, n: number): PlayerRow[] {
  return pool.filter((x) => x.id !== p.id)
    .map((x) => ({ x, d: Math.abs(x.overallRating - p.overallRating) }))
    .sort((a, b) => a.d - b.d || b.x.overallRating - a.x.overallRating || a.x.slug.localeCompare(b.x.slug))
    .slice(0, n).map((e) => e.x);
}

export const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

/** Canonical compare path, alphabetical by slug so each pair has one URL. */
export function comparePath(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `/compare/${x}-vs-${y}`;
}

/** Top same-position matchups: #1 vs #2, #1 vs #3, #2 vs #3 in each group. */
export async function topMatchups(): Promise<{ group: PositionGroup; pairs: [PlayerRow, PlayerRow][] }[]> {
  return Promise.all(POSITION_GROUPS.map(async (group) => {
    const top = await loadGroup(group, 3);
    const pairs: [PlayerRow, PlayerRow][] = [];
    if (top.length >= 2) pairs.push([top[0], top[1]]);
    if (top.length >= 3) pairs.push([top[0], top[2]], [top[1], top[2]]);
    return { group, pairs };
  }));
}
