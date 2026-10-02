import { and, eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seasonValue } from '@/lib/game/eightytwo';
import { getRedis } from './redis';

/**
 * 82-0 data from ESPN's public core API: every franchise's roster for every season since 1980, with each
 * player's per-game regular season stats. Runs in the worker (the dev container cannot reach ESPN).
 * Finished team-seasons are skipped on later runs, so an interrupted backfill resumes where it stopped;
 * the latest season is always refreshed.
 */
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
export const FIRST_SEASON = 1980;

/** ESPN names a season by its end year. A season counts once its regular season has started (late October). */
export function latestSeason(now = new Date()): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() > 9 || (now.getUTCMonth() === 9 && now.getUTCDate() >= 21) ? y + 1 : y;
}

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
const idsFrom = (j: Json | null) => ((j?.items as { $ref: string }[] | undefined) ?? []).map((x) => Number(x.$ref.match(/\/(\d+)\?/)?.[1])).filter(Number.isFinite);

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
  // Games played is not always listed; minutes over minutes per game recovers it.
  const gp = Math.round(s.gamesPlayed ?? (s.minutes && s.avgMinutes ? s.minutes / s.avgMinutes : 0));
  const pct = (v: number | undefined) => (v == null ? null : v > 1 ? v / 100 : v);
  const per = (avg: number | undefined, total: number | undefined) => avg ?? (total != null && gp > 0 ? total / gp : 0);
  return {
    gp,
    mpg: s.avgMinutes ?? 0,
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

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

export async function syncNba(opts: { from?: number; to?: number; fetchImpl?: typeof fetch } = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const latest = latestSeason();
  const from = opts.from ?? FIRST_SEASON, to = opts.to ?? latest;
  const lock = await getRedis().set('nba:sync-lock', '1', 'EX', 3 * 3600, 'NX').catch(() => 'OK');
  if (!lock) { console.log('[nba] sync already running'); return null; }
  const known = new Set((await db.select({ id: schema.nbaPlayers.id }).from(schema.nbaPlayers)).map((r) => r.id));
  const done = new Set((await db.select({ t: schema.nbaTeamSeasons.teamId, s: schema.nbaTeamSeasons.season }).from(schema.nbaTeamSeasons)).map((r) => `${r.t}:${r.s}`));
  let rows = 0, seasonsDone = 0;
  try {
    for (let season = to; season >= from; season--) {
      const teams = idsFrom(await get(`${CORE}/seasons/${season}/teams?limit=50`, fetchImpl));
      const todo = teams.filter((t) => season >= latest - 1 || !done.has(`${t}:${season}`));
      if (!todo.length) continue;
      const stats = new Map<number, ReturnType<typeof lineFrom> | null>();
      await pool(todo, 4, async (teamId) => {
        const team = await get(`${CORE}/seasons/${season}/teams/${teamId}`, fetchImpl);
        if (!team) return;
        const athletes = idsFrom(await get(`${CORE}/seasons/${season}/teams/${teamId}/athletes?limit=100`, fetchImpl));
        await pool(athletes, 6, async (pid) => {
          if (!known.has(pid)) {
            const a = await get(`${CORE}/athletes/${pid}`, fetchImpl) ?? await get(`${CORE}/seasons/${season}/athletes/${pid}`, fetchImpl);
            if (!a?.fullName) return;
            const pos = (a.position as { abbreviation?: string } | undefined)?.abbreviation ?? 'F';
            const headshot = (a.headshot as { href?: string } | undefined)?.href ?? null;
            await db.insert(schema.nbaPlayers).values({ id: pid, fullName: String(a.fullName), position: pos, headshot })
              .onConflictDoUpdate({ target: schema.nbaPlayers.id, set: { fullName: String(a.fullName), position: pos, headshot } });
            known.add(pid);
          }
          if (!stats.has(pid)) stats.set(pid, lineFrom(readStats(await get(`${CORE}/seasons/${season}/types/2/athletes/${pid}/statistics`, fetchImpl))));
          const line = stats.get(pid);
          if (!line || line.gp < 1) return;
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
      console.log(`[nba] season ${season} synced: ${todo.length} teams, ${rows} player-seasons so far`);
    }
  } finally {
    await getRedis().del('nba:sync-lock').catch(() => {});
  }
  const [c] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.nbaPlayerSeasons);
  const [p] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.nbaPlayers);
  const summary = { from, to, seasonsDone, rowsWritten: rows, totalPlayerSeasons: c.n, players: p.n };
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
