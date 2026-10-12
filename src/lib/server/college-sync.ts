import { and, eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seasonValue } from '@/lib/game/eightytwo';
import { get, lineFrom, nameOf, pool, readStats } from './nba-sync';
import { getRedis } from './redis';

/**
 * College football, men's basketball and women's basketball from ESPN. Football keeps each FBS team-season's stat
 * leaders as ESPN lists them (the leaders feed already carries the stat line, so no per-player stats calls).
 * Basketball takes a fixed list of well-known programs (a school keeps one ESPN id across seasons), reads each
 * season's scoring leaders to name the rotation, then each player's regular season line, as the WNBA sync does.
 * Finished seasons are skipped on later runs; the latest two always refresh. Runs in the worker (the dev container
 * cannot reach ESPN).
 */
export const COLLEGE = {
  cfb: { sport: 'football', league: 'college-football', group: 80, first: 2010, label: 'College football' },
  mbb: { sport: 'basketball', league: 'mens-college-basketball', group: 50, first: 2008, label: "Men's college basketball" },
  wbb: { sport: 'basketball', league: 'womens-college-basketball', group: 50, first: 2010, label: "Women's college basketball" },
} as const;
export type CollegeLeague = keyof typeof COLLEGE;
const core = (lg: CollegeLeague) => `https://sports.core.api.espn.com/v2/sports/${COLLEGE[lg].sport}/leagues/${COLLEGE[lg].league}`;

/** Football seasons are named by the year they start (Aug); basketball by the year they end (a season counts from November). */
export function latestCollegeSeason(lg: CollegeLeague, now = new Date()): number {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  return lg === 'cfb' ? (m >= 7 ? y : y - 1) : (m >= 10 ? y + 1 : y);
}

/** What each football category keeps: how many leaders per team-season (the feed lists up to 25). */
export const FOOTBALL_CATEGORIES: Record<string, number> = {
  passingYards: 3, rushingYards: 4, receivingYards: 5, sacks: 3, interceptions: 3, totalTackles: 4,
};
/** How many of a program's top scorers get a full basketball line each season. */
const HOOPS_DEEP = 8;

/** Programs whose names are known to everyone. Matched against ESPN's school name (case, spaces and punctuation ignored). */
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export const MBB_PROGRAMS = ['Duke', 'Kentucky', 'Kansas', 'North Carolina', 'UCLA', 'UConn', 'Gonzaga', 'Villanova', 'Michigan State', 'Louisville', 'Arizona', 'Florida', 'Syracuse', 'Indiana', 'Purdue', 'Houston',
  'Baylor', 'Texas', 'Tennessee', 'Auburn', 'Alabama', 'Arkansas', 'Oregon', 'Wisconsin', 'Maryland', 'Ohio State', 'Illinois', 'Iowa', 'Virginia', 'Michigan', 'Notre Dame', 'Georgetown', 'Memphis', 'Oklahoma',
  'Creighton', 'Marquette', "St. John's", 'Xavier', 'San Diego State', "Saint Mary's", 'BYU', 'Texas Tech', 'Iowa State', 'Kansas State', 'West Virginia', 'Cincinnati', 'Butler', 'Wichita State', 'VCU',
  'Florida State', 'Miami', 'NC State', 'Pittsburgh', 'Wake Forest', 'Virginia Tech', 'Clemson', 'Georgia Tech', 'UNLV', 'Utah', 'Colorado', 'Stanford', 'California', 'Washington', 'Arizona State', 'USC',
  'Texas A&M', 'LSU', 'Mississippi State', 'Ole Miss', 'Missouri', 'Vanderbilt', 'Georgia', 'South Carolina', 'Nebraska', 'Minnesota', 'Penn State', 'Northwestern', 'Rutgers', 'Seton Hall', 'Providence',
  'TCU', 'SMU', 'Oklahoma State', 'UCF', 'Dayton', 'Davidson', 'Loyola Chicago', 'Nevada', 'Boise State', 'New Mexico', 'Colorado State', 'Utah State', 'Saint Joseph\'s', 'Belmont', 'Murray State'];
export const WBB_PROGRAMS = ['UConn', 'South Carolina', 'Stanford', 'Tennessee', 'Notre Dame', 'Baylor', 'LSU', 'Iowa', 'Texas', 'UCLA', 'USC', 'Louisville', 'Maryland', 'NC State', 'Oregon', 'Ohio State',
  'Duke', 'North Carolina', 'Oklahoma', 'Kentucky', 'Virginia Tech', 'Utah', 'Ole Miss', 'Gonzaga', 'Michigan', 'Colorado', 'Mississippi State', 'Georgia', 'Arizona', 'Florida State', 'Miami', 'Kansas State',
  'Syracuse', 'Texas A&M', 'Arkansas', 'Auburn', 'Indiana', 'Purdue', 'Princeton', 'Oregon State', 'Washington', 'West Virginia', 'Creighton', 'Marquette', 'Villanova', 'Penn State', 'Michigan State', 'Illinois'];

export interface Program { id: number; name: string; location: string; abbreviation: string; color: string | null; logo: string | null }
type J = Record<string, any>;

/** ESPN's site API rejects bot-style user agents. */
async function siteGet(url: string, fetchImpl: typeof fetch): Promise<J | null> {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetchImpl(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20_000) }); if (r.ok) return (await r.json()) as J; if (r.status === 404) return null; } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 600 * (i + 1)));
  }
  return null;
}

/** The programs for a league: football's FBS teams, or the curated basketball programs found among Division I. */
export async function listPrograms(lg: CollegeLeague, fetchImpl: typeof fetch = fetch): Promise<{ programs: Program[]; missing: string[] }> {
  const c = COLLEGE[lg];
  const j = await siteGet(`https://site.api.espn.com/apis/site/v2/sports/${c.sport}/${c.league}/teams?groups=${c.group}&limit=500`, fetchImpl);
  const all: Program[] = ((j?.sports?.[0]?.leagues?.[0]?.teams ?? []) as J[]).map((x) => x.team as J).filter((t) => t?.id && t.location).map((t) => ({
    id: Number(t.id), name: String(t.displayName ?? t.name), location: String(t.location), abbreviation: String(t.abbreviation ?? ''),
    color: t.color ? `#${t.color}` : null, logo: ((t.logos as { href: string }[] | undefined) ?? [])[0]?.href ?? null,
  }));
  if (lg === 'cfb') return { programs: all, missing: [] };
  const wanted = (lg === 'mbb' ? MBB_PROGRAMS : WBB_PROGRAMS).map(key);
  const programs = all.filter((p) => wanted.includes(key(p.location)));
  const have = new Set(programs.map((p) => key(p.location)));
  return { programs, missing: wanted.filter((w) => !have.has(w)) };
}

/** One football leaders feed -> rows to keep. Pure, so the shapes can be tested without ESPN. */
export function parseFootballLeaders(j: J | null): { category: string; rank: number; playerId: number; value: number; display: string | null }[] {
  const out: { category: string; rank: number; playerId: number; value: number; display: string | null }[] = [];
  for (const cat of ((j?.categories ?? []) as J[])) {
    const cap = FOOTBALL_CATEGORIES[cat.name as string];
    if (!cap) continue;
    ((cat.leaders ?? []) as J[]).slice(0, cap).forEach((l, i) => {
      const playerId = Number(String(l.athlete?.$ref ?? '').match(/athletes\/(\d+)/)?.[1]);
      const value = Number(l.value);
      if (!Number.isFinite(playerId) || !Number.isFinite(value)) return;
      out.push({ category: cat.name as string, rank: i + 1, playerId, value, display: typeof l.displayValue === 'string' ? l.displayValue : null });
    });
  }
  return out;
}

/** The scoring leaders of a basketball team-season, best first. */
export function parseScorers(j: J | null, n = HOOPS_DEEP): number[] {
  const cat = ((j?.categories ?? []) as J[]).find((c) => c.name === 'pointsPerGame');
  return ((cat?.leaders ?? []) as J[]).slice(0, n).map((l) => Number(String(l.athlete?.$ref ?? '').match(/athletes\/(\d+)/)?.[1])).filter(Number.isFinite);
}

export async function syncCollege(opts: { leagues?: CollegeLeague[]; from?: number; to?: number; fetchImpl?: typeof fetch } = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const lock = await getRedis().set('college:sync-lock', '1', 'EX', 6 * 3600, 'NX').catch(() => 'OK');
  if (!lock) { console.log('[college] sync already running'); return null; }
  const summary: Record<string, unknown> = {};
  try {
    for (const lg of opts.leagues ?? (['cfb', 'mbb', 'wbb'] as const)) {
      const started = Date.now();
      const latest = latestCollegeSeason(lg);
      const from = opts.from ?? COLLEGE[lg].first, to = opts.to ?? latest;
      const { programs, missing } = await listPrograms(lg, fetchImpl);
      if (!programs.length) { console.warn(`[college] ${lg}: no programs from ESPN, skipping`); summary[lg] = { programs: 0 }; continue; }
      if (missing.length) console.log(`[college] ${lg}: ${programs.length} programs, not found on ESPN: ${missing.join(', ')}`);
      for (const p of programs) {
        const row = { league: lg, id: p.id, name: p.name, location: p.location, abbreviation: p.abbreviation, color: p.color, logoUrl: p.logo };
        await db.insert(schema.collegeTeams).values(row).onConflictDoUpdate({ target: [schema.collegeTeams.league, schema.collegeTeams.id], set: row });
      }
      const known = new Set((await db.select({ id: schema.collegePlayers.id }).from(schema.collegePlayers).where(eq(schema.collegePlayers.league, lg))).map((r) => r.id));
      /** Name, position and photo of one athlete, stored once. */
      const ensure = async (pid: number, season: number): Promise<boolean> => {
        if (known.has(pid)) return true;
        let a = await get(`${core(lg)}/seasons/${season}/athletes/${pid}`, fetchImpl);
        if (!nameOf(a)) a = await get(`${core(lg)}/athletes/${pid}`, fetchImpl);
        const name = nameOf(a);
        if (!name) return false;
        const position = (a!.position as { abbreviation?: string } | undefined)?.abbreviation ?? null;
        const headshot = (a!.headshot as { href?: string } | undefined)?.href ?? null;
        await db.insert(schema.collegePlayers).values({ league: lg, id: pid, name, position, headshot })
          .onConflictDoUpdate({ target: [schema.collegePlayers.league, schema.collegePlayers.id], set: { name, position, headshot } });
        known.add(pid);
        return true;
      };
      let rows = 0, unnamed = 0, noStats = 0, seasonsDone = 0;
      for (let season = to; season >= from; season--) {
        const before = rows;
        const done = new Set<number>();
        if (season < latest - 1) {
          const have = lg === 'cfb'
            ? await db.selectDistinct({ t: schema.collegeLeaders.teamId }).from(schema.collegeLeaders).where(and(eq(schema.collegeLeaders.league, lg), eq(schema.collegeLeaders.season, season)))
            : await db.selectDistinct({ t: schema.collegeHoops.teamId }).from(schema.collegeHoops).where(and(eq(schema.collegeHoops.league, lg), eq(schema.collegeHoops.season, season)));
          for (const h of have) done.add(h.t);
        }
        const todo = programs.filter((p) => !done.has(p.id));
        if (!todo.length) continue;
        await pool(todo, lg === 'cfb' ? 6 : 4, async (team) => {
          const feed = await get(`${core(lg)}/seasons/${season}/types/2/teams/${team.id}/leaders`, fetchImpl);
          if (!feed) return;
          if (lg === 'cfb') {
            const lines = parseFootballLeaders(feed);
            await pool(lines, 6, async (l) => {
              if (!(await ensure(l.playerId, season))) { unnamed++; return; }
              const row = { league: lg, season, teamId: team.id, category: l.category, playerId: l.playerId, rank: l.rank, value: l.value, display: l.display };
              await db.insert(schema.collegeLeaders).values(row)
                .onConflictDoUpdate({ target: [schema.collegeLeaders.league, schema.collegeLeaders.season, schema.collegeLeaders.teamId, schema.collegeLeaders.category, schema.collegeLeaders.playerId], set: row });
              rows++;
            });
          } else {
            await pool(parseScorers(feed), 4, async (pid) => {
              if (!(await ensure(pid, season))) { unnamed++; return; }
              const line = lineFrom(readStats(await get(`${core(lg)}/seasons/${season}/types/2/athletes/${pid}/statistics`, fetchImpl)));
              if (line.gp < 8 || line.mpg < 8) { noStats++; return; }
              const row = { league: lg, playerId: pid, teamId: team.id, season, gp: line.gp, mpg: line.mpg, ppg: line.ppg, rpg: line.rpg, apg: line.apg, spg: line.spg, bpg: line.bpg, value: seasonValue(line) };
              await db.insert(schema.collegeHoops).values(row)
                .onConflictDoUpdate({ target: [schema.collegeHoops.league, schema.collegeHoops.playerId, schema.collegeHoops.teamId, schema.collegeHoops.season], set: row });
              rows++;
            });
          }
        });
        seasonsDone++;
        console.log(`[college] ${lg} ${season}: ${todo.length} teams, ${rows - before} rows, ${unnamed} unnamed, ${noStats} without stats so far`);
      }
      summary[lg] = { programs: programs.length, from, to, seasonsDone, rows, unnamed, noStats, ms: Date.now() - started };
    }
  } finally {
    await getRedis().del('college:sync-lock').catch(() => {});
  }
  console.log('[college] sync done', JSON.stringify(summary));
  return summary;
}

/** For the logs: row counts per league and the best lines of the latest season with data. */
export async function collegeSpotCheck() {
  const counts = await db.execute<{ league: string; n: number; seasons: number }>(dsql`
    select league, count(*)::int as n, count(distinct season)::int as seasons from (
      select league, season from college_leaders union all select league, season from college_hoops) x group by league order by league`);
  console.log('[college] spot check counts', JSON.stringify([...counts]));
  const hoops = await db.execute<{ league: string; name: string; school: string; season: number; ppg: number }>(dsql`
    select h.league, p.name, t.location as school, h.season, h.ppg from college_hoops h
    join college_players p on p.league = h.league and p.id = h.player_id join college_teams t on t.league = h.league and t.id = h.team_id
    order by h.value desc limit 6`);
  console.log('[college] spot check hoops', JSON.stringify([...hoops]));
  const fb = await db.execute<{ name: string; school: string; season: number; value: number; display: string | null }>(dsql`
    select p.name, t.location as school, l.season, l.value, l.display from college_leaders l
    join college_players p on p.league = l.league and p.id = l.player_id join college_teams t on t.league = l.league and t.id = l.team_id
    where l.category = 'rushingYards' order by l.value desc limit 4`);
  console.log('[college] spot check football', JSON.stringify([...fb]));
}
