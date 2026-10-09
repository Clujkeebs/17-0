import { and, desc, eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seasonValue } from '@/lib/game/eightytwo';
import { get, idsFrom, leaderIds, lineFrom, nameOf, pool, readStats } from './nba-sync';
import { getRedis } from './redis';

/**
 * WNBA seasons from ESPN's core API, read the same way as the NBA: each team-season's stat leaders name the
 * rotation, then each player's regular season line. ESPN names a WNBA season by its calendar year.
 * Finished team-seasons are skipped on later runs; the latest season always refreshes.
 */
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/wnba';
/** The league's first season. Years ESPN has no stats for are logged and skipped. */
export const WNBA_FIRST_SEASON = 1997;

/** A season counts once its regular season has started (mid-May). */
export function latestWnbaSeason(now = new Date()): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() > 4 || (now.getUTCMonth() === 4 && now.getUTCDate() >= 14) ? y : y - 1;
}

export async function syncWnba(opts: { from?: number; to?: number; fetchImpl?: typeof fetch } = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const latest = latestWnbaSeason();
  const from = opts.from ?? WNBA_FIRST_SEASON, to = opts.to ?? latest;
  const lock = await getRedis().set('wnba:sync-lock', '1', 'EX', 2 * 3600, 'NX').catch(() => 'OK');
  if (!lock) { console.log('[wnba] sync already running'); return null; }
  const known = new Set((await db.select({ id: schema.wnbaPlayers.id }).from(schema.wnbaPlayers)).map((r) => r.id));
  const done = new Set((await db.select({ t: schema.wnbaPlayerSeasons.teamId, s: schema.wnbaPlayerSeasons.season, n: dsql<number>`count(*)::int` })
    .from(schema.wnbaPlayerSeasons).groupBy(schema.wnbaPlayerSeasons.teamId, schema.wnbaPlayerSeasons.season)).filter((r) => r.n >= 5).map((r) => `${r.t}:${r.s}`));
  let rows = 0, seasonsDone = 0, misses = 0, noStats = 0;
  const empty: number[] = [];
  try {
    for (let season = to; season >= from; season--) {
      const teams = idsFrom(await get(`${CORE}/seasons/${season}/teams?limit=50`, fetchImpl));
      const todo = teams.filter((t) => season >= latest - 1 || !done.has(`${t}:${season}`));
      if (!todo.length) { if (!teams.length) empty.push(season); continue; }
      const before = rows;
      await pool(todo, 4, async (teamId) => {
        const team = await get(`${CORE}/seasons/${season}/teams/${teamId}`, fetchImpl);
        if (!team) return;
        const athletes = leaderIds(await get(`${CORE}/seasons/${season}/types/2/teams/${teamId}/leaders`, fetchImpl));
        await pool(athletes, 6, async (pid) => {
          if (!known.has(pid)) {
            let a = await get(`${CORE}/seasons/${season}/athletes/${pid}`, fetchImpl);
            if (!nameOf(a)) a = await get(`${CORE}/athletes/${pid}`, fetchImpl);
            const name = nameOf(a);
            if (!name) { misses++; return; }
            const pos = (a!.position as { abbreviation?: string } | undefined)?.abbreviation ?? 'F';
            const headshot = (a!.headshot as { href?: string } | undefined)?.href ?? null;
            await db.insert(schema.wnbaPlayers).values({ id: pid, fullName: name, position: pos, headshot })
              .onConflictDoUpdate({ target: schema.wnbaPlayers.id, set: { fullName: name, position: pos, headshot } });
            known.add(pid);
          }
          const line = lineFrom(readStats(await get(`${CORE}/seasons/${season}/types/2/athletes/${pid}/statistics`, fetchImpl)));
          if (line.gp < 1) { noStats++; return; }
          const row = { playerId: pid, teamId, season, ...line, value: seasonValue(line) };
          await db.insert(schema.wnbaPlayerSeasons).values(row)
            .onConflictDoUpdate({ target: [schema.wnbaPlayerSeasons.playerId, schema.wnbaPlayerSeasons.teamId, schema.wnbaPlayerSeasons.season], set: row });
          rows++;
        });
        const logo = ((team.logos as { href: string }[] | undefined) ?? [])[0]?.href ?? null;
        const ts = { teamId, season, name: String(team.name ?? team.displayName), location: String(team.location ?? ''), abbreviation: String(team.abbreviation ?? ''), color: team.color ? `#${team.color}` : null, logoUrl: logo, syncedAt: new Date() };
        await db.insert(schema.wnbaTeamSeasons).values(ts).onConflictDoUpdate({ target: [schema.wnbaTeamSeasons.teamId, schema.wnbaTeamSeasons.season], set: ts });
      });
      seasonsDone++;
      if (rows === before) empty.push(season);
      console.log(`[wnba] season ${season} synced: ${todo.length} teams, ${rows - before} player-seasons, ${misses} unnamed, ${noStats} without stats so far`);
    }
  } finally {
    await getRedis().del('wnba:sync-lock').catch(() => {});
  }
  const [c] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.wnbaPlayerSeasons);
  const summary = { from, to, seasonsDone, rowsWritten: rows, unnamed: misses, withoutStats: noStats, seasonsWithNoStats: empty.sort().join(',') || 'none', totalPlayerSeasons: c.n };
  console.log('[wnba] sync done', JSON.stringify(summary));
  return summary;
}

/** Spot check for the logs: the best seasons of the latest year with data, and the best since 1997. */
export async function wnbaSpotCheck() {
  const top = (where?: ReturnType<typeof eq>) => db.select({ name: schema.wnbaPlayers.fullName, season: schema.wnbaPlayerSeasons.season, team: schema.wnbaTeamSeasons.abbreviation, ppg: schema.wnbaPlayerSeasons.ppg, value: schema.wnbaPlayerSeasons.value })
    .from(schema.wnbaPlayerSeasons).innerJoin(schema.wnbaPlayers, eq(schema.wnbaPlayers.id, schema.wnbaPlayerSeasons.playerId))
    .innerJoin(schema.wnbaTeamSeasons, and(eq(schema.wnbaTeamSeasons.teamId, schema.wnbaPlayerSeasons.teamId), eq(schema.wnbaTeamSeasons.season, schema.wnbaPlayerSeasons.season)))
    .where(where).orderBy(desc(schema.wnbaPlayerSeasons.value)).limit(6);
  const [last] = await db.select({ s: dsql<number>`max(season)::int` }).from(schema.wnbaPlayerSeasons);
  if (!last?.s) { console.log('[wnba] spot check: no seasons stored'); return; }
  const fmt = (r: Awaited<ReturnType<typeof top>>) => r.map((x) => `${x.name} ${x.team} ${x.season} ${x.ppg.toFixed(1)}ppg v${x.value}`).join('; ');
  console.log(`[wnba] spot check ${last.s}`, fmt(await top(eq(schema.wnbaPlayerSeasons.season, last.s))));
  console.log('[wnba] spot check all-time', fmt(await top()));
}
