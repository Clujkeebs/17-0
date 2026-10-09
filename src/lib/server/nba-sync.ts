import { and, eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seasonValue } from '@/lib/game/eightytwo';
import { getRedis } from './redis';

/**
 * 82-0 data from ESPN's public core API: every franchise's players for every season since 1980, with each
 * player's per-game regular season stats. Who played for whom comes from each team-season's stat leaders
 * (15 deep in 16 categories, which covers the whole rotation). ESPN's per-season team roster endpoint is not
 * used: it returns today's roster for past seasons. Runs in the worker (the dev container cannot reach ESPN).
 * Finished team-seasons are skipped on later runs, so an interrupted backfill resumes where it stopped;
 * the latest season is always refreshed.
 */
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
/** ESPN has no per-player stats before the 1984-85 season. */
export const FIRST_SEASON = 1985;

/** ESPN names a season by its end year. A season counts once its regular season has started (late October). */
export function latestSeason(now = new Date()): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() > 9 || (now.getUTCMonth() === 9 && now.getUTCDate() >= 21) ? y + 1 : y;
}

type Json = Record<string, unknown>;
export async function get(url: string, fetchImpl: typeof fetch, tries = 3): Promise<Json | null> {
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
/** Bump when stored rows were built wrong and must be rebuilt from scratch. */
const DATA_VERSION = 2;

export const leaderIds = (j: Json | null) => [...new Set(((j?.categories as { leaders?: { athlete?: { $ref?: string } }[] }[] | undefined) ?? [])
  .flatMap((c) => c.leaders ?? []).map((l) => Number(l.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1])).filter(Number.isFinite))];
export const idsFrom = (j: Json | null) => ((j?.items as { $ref: string }[] | undefined) ?? []).map((x) => Number(x.$ref.match(/\/(\d+)\?/)?.[1])).filter(Number.isFinite);

/** Flattens ESPN's statistics categories into name -> value. */
export function readStats(j: Json | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of ((j?.splits as { categories?: { stats: { name: string; value: number }[] }[] } | undefined)?.categories ?? [])) {
    for (const s of c.stats) if (typeof s.value === 'number' && !(s.name in out)) out[s.name] = s.value;
  }
  return out;
}

/** Per-game line from ESPN's stat names. Percentages arrive as 0-100. */
export function lineFrom(s: Record<string, number>) {
  // Games played is not always listed (older seasons often lack it and minutes too); any total over its
  // per-game average recovers it.
  const ratio = (t?: number, a?: number) => (t && a ? t / a : 0);
  const gp = Math.round(s.gamesPlayed || ratio(s.minutes, s.avgMinutes) || ratio(s.points, s.avgPoints) || ratio(s.rebounds, s.avgRebounds) || ratio(s.assists, s.avgAssists) || 0);
  const pct = (v: number | undefined) => (v == null ? null : v > 1 ? v / 100 : v);
  const per = (avg: number | undefined, total: number | undefined) => avg ?? (total != null && gp > 0 ? total / gp : 0);
  return {
    gp,
    mpg: s.avgMinutes ?? (s.minutes != null && gp > 0 ? s.minutes / gp : 0),
    ppg: per(s.avgPoints, s.points),
    rpg: per(s.avgRebounds, s.rebounds),
    apg: per(s.avgAssists, s.assists),
    spg: per(s.avgSteals, s.steals),
    bpg: per(s.avgBlocks, s.blocks),
    tov: s.avgTurnovers ?? (s.turnovers != null && gp > 0 ? s.turnovers / gp : null),
    fgPct: pct(s.fieldGoalPct),
    tpPct: pct(s.threePointFieldGoalPct ?? s.threePointPct),
    ftPct: pct(s.freeThrowPct),
  };
}

export async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

/** Some older athlete records carry only a display name, or first and last names. */
export const nameOf = (a: Json | null): string | null => {
  if (!a) return null;
  const full = a.fullName ?? a.displayName ?? [a.firstName, a.lastName].filter(Boolean).join(' ');
  return typeof full === 'string' && full.trim() ? full.trim() : null;
};

/** Bumped to re-read every past season once without a wipe (v2: players whose record had no fullName were skipped;
 * v3: old lines without games played or minutes were dropped as "no stats", Larry Bird among them). */
const ROSTER_VERSION = 3;

/** Bumped when seasonValue changes: stored values are recomputed from the stored stat lines, no refetch. */
const VALUE_VERSION = 2;

/** Recomputes every stored season's value with today's formula (v2: bent top, so only all-time years sit near 99). */
export async function rescoreNba() {
  const [ver] = await db.select().from(schema.gameConfigs).where(and(eq(schema.gameConfigs.gameType, '82-0'), eq(schema.gameConfigs.configKey, 'value_version'))).limit(1);
  if (Number(ver?.configValue ?? 1) >= VALUE_VERSION) return 0;
  const rows = await db.select().from(schema.nbaPlayerSeasons);
  const changed = rows.map((r) => ({ r, v: seasonValue(r) })).filter(({ r, v }) => v !== r.value);
  for (let i = 0; i < changed.length; i += 500) {
    const chunk = changed.slice(i, i + 500);
    const vals = dsql.join(chunk.map(({ r, v }) => dsql`(${r.playerId}::int, ${r.teamId}::int, ${r.season}::int, ${v}::real)`), dsql`, `);
    await db.execute(dsql`update nba_player_seasons s set value = v.value from (values ${vals}) as v(pid, tid, season, value)
      where s.player_id = v.pid and s.team_id = v.tid and s.season = v.season`);
  }
  if (ver) await db.update(schema.gameConfigs).set({ configValue: VALUE_VERSION, updatedAt: new Date() }).where(eq(schema.gameConfigs.id, ver.id));
  else await db.insert(schema.gameConfigs).values({ gameType: '82-0', configKey: 'value_version', configValue: VALUE_VERSION, updatedBy: 'nba-sync' });
  console.log(`[nba] rescored ${changed.length} of ${rows.length} seasons, value version ${VALUE_VERSION}`);
  return changed.length;
}

export async function syncNba(opts: { from?: number; to?: number; fetchImpl?: typeof fetch } = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const latest = latestSeason();
  const from = opts.from ?? FIRST_SEASON, to = opts.to ?? latest;
  const lock = await getRedis().set('nba:sync-lock', '1', 'EX', 3 * 3600, 'NX').catch(() => 'OK');
  if (!lock) { console.log('[nba] sync already running'); return null; }
  const [ver] = await db.select().from(schema.gameConfigs).where(and(eq(schema.gameConfigs.gameType, '82-0'), eq(schema.gameConfigs.configKey, 'data_version'))).limit(1);
  if (Number(ver?.configValue ?? 0) < DATA_VERSION) {
    await db.delete(schema.nbaPlayerSeasons);
    await db.delete(schema.nbaTeamSeasons);
    if (ver) await db.update(schema.gameConfigs).set({ configValue: DATA_VERSION, updatedAt: new Date() }).where(eq(schema.gameConfigs.id, ver.id));
    else await db.insert(schema.gameConfigs).values({ gameType: '82-0', configKey: 'data_version', configValue: DATA_VERSION, updatedBy: 'nba-sync' });
    console.log('[nba] cleared stored seasons for a rebuild, data version', DATA_VERSION);
  }
  const known = new Set((await db.select({ id: schema.nbaPlayers.id }).from(schema.nbaPlayers)).map((r) => r.id));
  // A team-season is done only when it has a real roster stored, so a pass that came back empty is retried.
  const [rv] = await db.select().from(schema.gameConfigs).where(and(eq(schema.gameConfigs.gameType, '82-0'), eq(schema.gameConfigs.configKey, 'roster_version'))).limit(1);
  const repair = Number(rv?.configValue ?? 1) < ROSTER_VERSION && from === FIRST_SEASON;
  if (repair) console.log('[nba] re-reading every season once, roster version', ROSTER_VERSION);
  const missed: string[] = [], noStatIds: string[] = [];
  const done = repair ? new Set<string>() : new Set((await db.select({ t: schema.nbaPlayerSeasons.teamId, s: schema.nbaPlayerSeasons.season, n: dsql<number>`count(*)::int` })
    .from(schema.nbaPlayerSeasons).groupBy(schema.nbaPlayerSeasons.teamId, schema.nbaPlayerSeasons.season)).filter((r) => r.n >= 5).map((r) => `${r.t}:${r.s}`));
  let rows = 0, seasonsDone = 0, misses = 0, noStats = 0;
  try {
    for (let season = to; season >= from; season--) {
      const teams = idsFrom(await get(`${CORE}/seasons/${season}/teams?limit=50`, fetchImpl));
      const todo = teams.filter((t) => season >= latest - 1 || !done.has(`${t}:${season}`));
      if (!todo.length) continue;
      const stats = new Map<number, ReturnType<typeof lineFrom> | null>();
      await pool(todo, 4, async (teamId) => {
        const team = await get(`${CORE}/seasons/${season}/teams/${teamId}`, fetchImpl);
        if (!team) return;
        const athletes = leaderIds(await get(`${CORE}/seasons/${season}/types/2/teams/${teamId}/leaders`, fetchImpl));
        await pool(athletes, 6, async (pid) => {
          if (!known.has(pid)) {
            // The league-wide record can be thin for retired players; the season record always names them.
            let a = await get(`${CORE}/seasons/${season}/athletes/${pid}`, fetchImpl);
            if (!nameOf(a)) a = await get(`${CORE}/athletes/${pid}`, fetchImpl);
            const name = nameOf(a);
            if (!name) { misses++; if (missed.length < 25) missed.push(`${pid}@${teamId}:${season}`); return; }
            const pos = (a!.position as { abbreviation?: string } | undefined)?.abbreviation ?? 'F';
            const headshot = (a!.headshot as { href?: string } | undefined)?.href ?? null;
            await db.insert(schema.nbaPlayers).values({ id: pid, fullName: name, position: pos, headshot })
              .onConflictDoUpdate({ target: schema.nbaPlayers.id, set: { fullName: name, position: pos, headshot } });
            known.add(pid);
          }
          if (!stats.has(pid)) stats.set(pid, lineFrom(readStats(await get(`${CORE}/seasons/${season}/types/2/athletes/${pid}/statistics`, fetchImpl))));
          const line = stats.get(pid);
          if (!line || line.gp < 1) {
            noStats++;
            if (noStatIds.length < 25) noStatIds.push(`${pid}@${teamId}:${season}`);
            return;
          }
          const row = { playerId: pid, teamId, season, ...line, value: seasonValue(line) };
          await db.insert(schema.nbaPlayerSeasons).values(row)
            .onConflictDoUpdate({ target: [schema.nbaPlayerSeasons.playerId, schema.nbaPlayerSeasons.teamId, schema.nbaPlayerSeasons.season], set: row });
          rows++;
        });
        const logo = ((team.logos as { href: string }[] | undefined) ?? [])[0]?.href ?? null;
        const ts = { teamId, season, name: String(team.name ?? team.displayName), location: String(team.location ?? ''), abbreviation: String(team.abbreviation ?? ''), color: team.color ? `#${team.color}` : null, logoUrl: logo, syncedAt: new Date() };
        await db.insert(schema.nbaTeamSeasons).values(ts).onConflictDoUpdate({ target: [schema.nbaTeamSeasons.teamId, schema.nbaTeamSeasons.season], set: ts });
      });
      seasonsDone++;
      console.log(`[nba] season ${season} synced: ${todo.length} teams, ${rows} player-seasons so far, ${misses} unnamed, ${noStats} without stats`);
    }
    if (repair) {
      if (rv) await db.update(schema.gameConfigs).set({ configValue: ROSTER_VERSION, updatedAt: new Date() }).where(eq(schema.gameConfigs.id, rv.id));
      else await db.insert(schema.gameConfigs).values({ gameType: '82-0', configKey: 'roster_version', configValue: ROSTER_VERSION, updatedBy: 'nba-sync' });
      await getRedis().del('nba:era-teams').catch(() => {});
      console.log('[nba] roster repair done, version', ROSTER_VERSION);
    }
  } finally {
    await getRedis().del('nba:sync-lock').catch(() => {});
  }
  if (missed.length) console.log('[nba] athletes with no name on ESPN (first 25)', missed.join(' '));
  if (noStatIds.length) console.log('[nba] athlete-seasons with no stat line (first 25)', noStatIds.join(' '));
  const [c] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.nbaPlayerSeasons);
  const [p] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.nbaPlayers);
  const summary = { from, to, seasonsDone, rowsWritten: rows, unnamed: misses, withoutStats: noStats, totalPlayerSeasons: c.n, players: p.n };
  console.log('[nba] sync done', JSON.stringify(summary));
  return summary;
}

/** Spot check for the logs: a famous season should land where people expect it. */
export async function nbaSpotCheck() {
  const rows = await db.select({ name: schema.nbaPlayers.fullName, season: schema.nbaPlayerSeasons.season, ppg: schema.nbaPlayerSeasons.ppg, value: schema.nbaPlayerSeasons.value })
    .from(schema.nbaPlayerSeasons).innerJoin(schema.nbaPlayers, eq(schema.nbaPlayers.id, schema.nbaPlayerSeasons.playerId))
    .where(and(eq(schema.nbaPlayerSeasons.teamId, 4), eq(schema.nbaPlayerSeasons.season, 1996))).orderBy(dsql`value desc`).limit(6);
  console.log('[nba] spot check 1995-96 Bulls', rows.map((r) => `${r.name} ${r.ppg.toFixed(1)}ppg v${r.value}`).join('; '));
}

/** Stars that must be on their team's board in that era; logged after every sync so a gap shows up in the logs. */
const MUST_HAVE: [string, string, number, number][] = [
  ['Larry Bird', 'BOS', 1985, 1989], ['Magic Johnson', 'LAL', 1985, 1989], ['Michael Jordan', 'CHI', 1985, 1998], ['Hakeem Olajuwon', 'HOU', 1990, 1999],
  ['Shaquille O\'Neal', 'LAL', 2000, 2004], ['Tim Duncan', 'SA', 2000, 2009], ['Kobe Bryant', 'LAL', 2000, 2009], ['LeBron James', 'CLE', 2004, 2010],
  ['Dirk Nowitzki', 'DAL', 2000, 2009], ['Stephen Curry', 'GS', 2010, 2019], ['Nikola Jokic', 'DEN', 2020, 2029], ['Giannis Antetokounmpo', 'MIL', 2020, 2029],
];
export async function nbaStarCheck() {
  const out: string[] = [];
  for (const [name, abbr, from, to] of MUST_HAVE) {
    const [r] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.nbaPlayerSeasons)
      .innerJoin(schema.nbaPlayers, eq(schema.nbaPlayers.id, schema.nbaPlayerSeasons.playerId))
      .innerJoin(schema.nbaTeamSeasons, and(eq(schema.nbaTeamSeasons.teamId, schema.nbaPlayerSeasons.teamId), eq(schema.nbaTeamSeasons.season, schema.nbaPlayerSeasons.season)))
      .where(and(dsql`${schema.nbaPlayers.fullName} ilike ${name.replace(/[^a-z' ]/gi, '%')}`, eq(schema.nbaTeamSeasons.abbreviation, abbr),
        dsql`${schema.nbaPlayerSeasons.season} between ${from} and ${to}`, dsql`${schema.nbaPlayerSeasons.gp} >= 20`));
    if (r?.n) { out.push(`${name} ${abbr} ${from}-${to}: ${r.n} seasons`); continue; }
    // Tell the two causes apart: never read at all, or read but with no team-season that counts.
    const [p] = await db.select({ id: schema.nbaPlayers.id }).from(schema.nbaPlayers).where(dsql`${schema.nbaPlayers.fullName} ilike ${name.replace(/[^a-z' ]/gi, '%')}`).limit(1);
    const rows = p ? await db.select({ t: schema.nbaPlayerSeasons.teamId, s: schema.nbaPlayerSeasons.season, gp: schema.nbaPlayerSeasons.gp }).from(schema.nbaPlayerSeasons).where(eq(schema.nbaPlayerSeasons.playerId, p.id)).limit(20) : [];
    out.push(`${name} ${abbr} ${from}-${to}: MISSING (${p ? `player ${p.id}, stored ${rows.map((x) => `${x.t}:${x.s}/${x.gp}gp`).join(' ') || 'no seasons'}` : 'not in nba_players'})`);
  }
  console.log('[nba] star check', out.join('; '));
}
