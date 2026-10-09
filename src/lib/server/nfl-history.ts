import { and, eq, isNotNull, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { positionGroup } from '@/lib/game/attributes';
import { ratePlayer } from '@/lib/game/formulas';
import { LEGEND_GROUPS, PER_TEAM, STAT_KEYS, gradeSeasons, legendGroup, seasonLine, type HistSeason, type LegendGroup, type Stats } from '@/lib/game/legend-grade';
import type { Attributes } from '@/lib/game/attributes';
import { LEGEND_FRANCHISE } from '@/lib/game/legends';
import { getRedis } from './redis';

/**
 * All-time legends from ESPN's public core API: every franchise's team-season stat leaders since 1980
 * (10 to 25 deep per category), stored raw in nfl_hist_seasons, then graded into nfl_legends. ESPN team ids
 * follow the franchise through moves (the Oilers are the Titans), and the 1980-95 Browns are Cleveland.
 * Runs in the worker. Finished seasons are skipped, so an interrupted backfill resumes where it stopped.
 */
const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
export const FIRST_NFL_SEASON = 1980;
/** The last finished regular season: an NFL season is named by its start year and ends in early January. */
export const lastFinishedSeason = (now = new Date()) => (now.getUTCMonth() >= 1 ? now.getUTCFullYear() - 1 : now.getUTCFullYear() - 2);

type Json = Record<string, unknown>;
async function get(url: string, fetchImpl: typeof fetch, tries = 3): Promise<Json | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetchImpl(url.replace(/^http:/, 'https:'), { signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return null;
      if (r.ok) return (await r.json()) as Json;
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 500 * (i + 1)));
  }
  return null;
}
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}
const idsFrom = (j: Json | null) => ((j?.items as { $ref: string }[] | undefined) ?? []).map((x) => Number(x.$ref.match(/\/(\d+)\?/)?.[1])).filter(Number.isFinite);

/** Merges a leaders response into athlete id -> stats, keeping only the stat categories legends use. */
export function leaderStats(j: Json | null): Map<number, Stats> {
  const out = new Map<number, Stats>();
  for (const c of (j?.categories as { name: string; leaders?: { value: number; athlete?: { $ref?: string } }[] }[] | undefined) ?? []) {
    if (!(STAT_KEYS as readonly string[]).includes(c.name)) continue;
    for (const l of c.leaders ?? []) {
      const id = Number(l.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1]);
      if (!Number.isFinite(id) || typeof l.value !== 'number') continue;
      const s = out.get(id) ?? {};
      s[c.name as keyof Stats] = Math.round(l.value * 10) / 10;
      out.set(id, s);
    }
  }
  return out;
}

export async function syncNflHistory(opts: { from?: number; to?: number; fetchImpl?: typeof fetch } = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const from = opts.from ?? FIRST_NFL_SEASON, to = opts.to ?? lastFinishedSeason();
  const lock = await getRedis().set('nfl-history:lock', '1', 'EX', 3 * 3600, 'NX').catch(() => 'OK');
  if (!lock) { console.log('[nfl-history] already running'); return null; }
  const known = new Set((await db.select({ id: schema.nflHistAthletes.id }).from(schema.nflHistAthletes)).map((r) => r.id));
  const done = new Set((await db.select({ s: schema.nflHistSeasons.season, n: dsql<number>`count(distinct ${schema.nflHistSeasons.espnTeamId})::int` })
    .from(schema.nflHistSeasons).groupBy(schema.nflHistSeasons.season)).filter((r) => r.n >= 26).map((r) => r.s));
  let rows = 0, seasons = 0, unnamed = 0;
  try {
    for (let season = to; season >= from; season--) {
      if (done.has(season)) continue;
      const teams = idsFrom(await get(`${CORE}/seasons/${season}/teams?limit=50`, fetchImpl));
      await pool(teams, 4, async (teamId) => {
        const stats = leaderStats(await get(`${CORE}/seasons/${season}/types/2/teams/${teamId}/leaders`, fetchImpl));
        await pool([...stats.keys()], 6, async (aid) => {
          if (!known.has(aid)) {
            let a = await get(`${CORE}/seasons/${season}/athletes/${aid}`, fetchImpl);
            if (!a?.fullName) a = await get(`${CORE}/athletes/${aid}`, fetchImpl);
            if (!a?.fullName) { unnamed++; return; }
            const row = { id: aid, fullName: String(a.fullName), position: (a.position as { abbreviation?: string } | undefined)?.abbreviation ?? '', headshot: (a.headshot as { href?: string } | undefined)?.href ?? null };
            await db.insert(schema.nflHistAthletes).values(row).onConflictDoUpdate({ target: schema.nflHistAthletes.id, set: row });
            known.add(aid);
          }
          const row = { athleteId: aid, espnTeamId: teamId, season, stats: stats.get(aid)! };
          await db.insert(schema.nflHistSeasons).values(row).onConflictDoUpdate({ target: [schema.nflHistSeasons.athleteId, schema.nflHistSeasons.espnTeamId, schema.nflHistSeasons.season], set: { stats: row.stats } });
          rows++;
        });
      });
      seasons++;
      console.log(`[nfl-history] season ${season}: ${teams.length} teams, ${rows} rows so far, ${unnamed} unnamed`);
    }
  } finally {
    await getRedis().del('nfl-history:lock').catch(() => {});
  }
  const summary = { from, to, seasons, rows, unnamed };
  console.log('[nfl-history] sync done', JSON.stringify(summary));
  return summary;
}

/** ESPN franchise id -> our team id, matched on today's nickname (then abbreviation). */
async function franchiseMap(fetchImpl: typeof fetch): Promise<Map<number, number>> {
  const ours = await db.select().from(schema.teams);
  const out = new Map<number, number>();
  const season = lastFinishedSeason() + 1;
  for (const id of idsFrom(await get(`${CORE}/seasons/${season}/teams?limit=50`, fetchImpl))) {
    const t = await get(`${CORE}/seasons/${season}/teams/${id}`, fetchImpl);
    if (!t) continue;
    const name = String(t.name ?? '').toLowerCase(), abbr = String(t.abbreviation ?? '').toUpperCase().replace('WSH', 'WAS');
    const hit = ours.find((o) => o.name.toLowerCase() === name) ?? ours.find((o) => o.abbreviation === abbr);
    if (hit) out.set(id, hit.id);
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '');

/** Grades the stored history and rewrites nfl_legends: each franchise's best retired players per group. */
export async function buildLegends(opts: { fetchImpl?: typeof fetch; teamMap?: Map<number, number> } = {}) {
  const teamMap = opts.teamMap ?? await franchiseMap(opts.fetchImpl ?? fetch);
  if (teamMap.size < 30) throw new Error(`Only ${teamMap.size} franchises matched; not rebuilding legends.`);
  const [athletes, hist, current, madden] = await Promise.all([
    db.select().from(schema.nflHistAthletes),
    db.select().from(schema.nflHistSeasons),
    db.select({ fullName: schema.players.fullName, position: schema.players.position, attributes: schema.players.attributes, espnId: schema.players.espnId, teamId: schema.players.teamId }).from(schema.players).where(and(eq(schema.players.isActive, true), isNotNull(schema.players.teamId))),
    db.select({ name: schema.players.fullName, slug: schema.players.slug }).from(schema.players).where(eq(schema.players.isAllTimeGreat, true)),
  ]);
  // Today's players are drafted as themselves, so they never double as legends.
  const active = new Set(current.map((p) => Number(p.espnId)).filter(Number.isFinite));
  const maddenNames = new Set(madden.filter((m) => LEGEND_FRANCHISE[m.slug]).map((m) => norm(m.name)));
  const range: Partial<Record<LegendGroup, number[]>> = {};
  for (const p of current) {
    const g = positionGroup(p.position);
    if (!(LEGEND_GROUPS as string[]).includes(g)) continue;
    (range[g as LegendGroup] ??= []).push(ratePlayer(p.attributes as Attributes, g));
  }
  const ath = new Map(athletes.map((a) => [a.id, a]));
  const seasons: (HistSeason & { athleteId: number; espnTeamId: number })[] = [];
  for (const h of hist) {
    const a = ath.get(h.athleteId);
    const g = a ? legendGroup(a.position, h.stats as Stats) : null;
    if (g) seasons.push({ key: `${h.athleteId}:${h.espnTeamId}:${h.season}`, group: g, season: h.season, stats: h.stats as Stats, athleteId: h.athleteId, espnTeamId: h.espnTeamId });
  }
  const grades = gradeSeasons(seasons, range);
  // Best season per athlete per franchise, then each franchise's top few per group.
  const best = new Map<string, (typeof seasons)[number] & { grade: number }>();
  for (const s of seasons) {
    const grade = grades.get(s.key);
    if (grade == null || active.has(s.athleteId) || !teamMap.has(s.espnTeamId) || maddenNames.has(norm(ath.get(s.athleteId)!.fullName))) continue;
    const k = `${s.athleteId}:${s.espnTeamId}`;
    if ((best.get(k)?.grade ?? -1) < grade) best.set(k, { ...s, grade });
  }
  const picked: (typeof schema.nflLegends.$inferInsert)[] = [];
  for (const [espnTeam, teamId] of teamMap) {
    for (const g of LEGEND_GROUPS) {
      const top = [...best.values()].filter((b) => b.espnTeamId === espnTeam && b.group === g).sort((a, b) => b.grade - a.grade).slice(0, PER_TEAM[g]);
      for (const b of top) {
        const a = ath.get(b.athleteId)!;
        picked.push({ espnId: a.id, fullName: a.fullName, position: a.position, group: g, teamId, season: b.season, grade: b.grade, line: seasonLine(g, b.stats), headshot: a.headshot });
      }
    }
  }
  // Today's players in their prime: each one's best graded season anywhere, filed under his current team, kept
  // only when it beats his current rating. All-time drafts him at that season instead of today's number.
  const prime = new Map<number, (typeof seasons)[number] & { grade: number }>();
  for (const s of seasons) {
    const grade = grades.get(s.key);
    if (grade == null || !active.has(s.athleteId)) continue;
    if ((prime.get(s.athleteId)?.grade ?? -1) < grade) prime.set(s.athleteId, { ...s, grade });
  }
  let primes = 0;
  for (const p of current) {
    const b = prime.get(Number(p.espnId));
    if (!b || p.teamId == null) continue;
    const g = positionGroup(p.position);
    if (g !== b.group || b.grade <= ratePlayer(p.attributes as Attributes, g)) continue;
    const a = ath.get(b.athleteId);
    picked.push({ espnId: b.athleteId, fullName: p.fullName, position: p.position, group: b.group, teamId: p.teamId, season: b.season, grade: b.grade, line: seasonLine(b.group, b.stats), headshot: a?.headshot ?? null });
    primes++;
  }
  await db.transaction(async (tx) => {
    await tx.delete(schema.nflLegends);
    for (let i = 0; i < picked.length; i += 200) await tx.insert(schema.nflLegends).values(picked.slice(i, i + 200));
  });
  await getRedis().del('legends:by-team').catch(() => {});
  const summary = { seasonsGraded: grades.size, legends: picked.length - primes, primes, franchises: teamMap.size };
  console.log('[nfl-history] legends built', JSON.stringify(summary));
  return summary;
}

/** Logs one franchise's legends so a deploy can be eyeballed (the 49ers should show Rice, Young, Montana-era names). */
export async function legendsSpotCheck(abbr = 'SF') {
  const [t] = await db.select().from(schema.teams).where(eq(schema.teams.abbreviation, abbr));
  if (!t) return;
  const rows = await db.select().from(schema.nflLegends).where(eq(schema.nflLegends.teamId, t.id));
  console.log(`[nfl-history] spot check ${abbr}`, rows.sort((a, b) => b.grade - a.grade).map((r) => `${r.group} ${r.fullName} ${r.season} ${r.grade}`).join('; '));
}
