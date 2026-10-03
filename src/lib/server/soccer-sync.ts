import { sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * Soccer data from ESPN's public endpoints (the same family the NFL and NBA syncs use): clubs and current rosters
 * for six leagues, and each league's goal and assist leaders for the last completed season and the current one.
 * Fields used are exactly the ones the probe showed: team id/name/abbreviation/logo/color; roster id, name,
 * position (G/D/M/F), age, citizenship, jersey; leader lines "M: 35, G: 27: A: 8".
 */
export const SOCCER_LEAGUES = [
  { key: 'eng.1', name: 'Premier League' }, { key: 'esp.1', name: 'La Liga' }, { key: 'ita.1', name: 'Serie A' },
  { key: 'ger.1', name: 'Bundesliga' }, { key: 'fra.1', name: 'Ligue 1' }, { key: 'usa.1', name: 'MLS' },
] as const;
export type SoccerLeague = (typeof SOCCER_LEAGUES)[number]['key'];
export const leagueName = (k: string) => SOCCER_LEAGUES.find((l) => l.key === k)?.name ?? k;

type J = Record<string, any>;
// ESPN's site API rejects bot-style user agents (the probe used this one and got every team).
const UA = { headers: { 'user-agent': 'Mozilla/5.0' } };
async function get(url: string): Promise<J | null> {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, UA); if (r.ok) return (await r.json()) as J; if (r.status === 404) return null; } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  return null;
}
const idFromRef = (ref: string | undefined, kind: 'athletes' | 'teams') => { const m = ref?.match(new RegExp(`/${kind}/(\\d+)`)); return m ? Number(m[1]) : null; };

/** The season a league is in now: European seasons start in July (2026 means 2026-27). MLS uses calendar years. */
export function currentSeason(league: string, now = new Date()): number {
  return league === 'usa.1' ? now.getUTCFullYear() : now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}
export const seasonLabel = (league: string, season: number) => (league === 'usa.1' ? String(season) : `${season}-${String((season + 1) % 100).padStart(2, '0')}`);

/** "M: 35, G: 27: A: 8" -> matches, goals, assists. */
export function parseLeaderLine(s: string | undefined): { matches: number; goals: number; assists: number } | null {
  if (!s) return null;
  const n = (k: string) => { const m = s.match(new RegExp(`${k}:\\s*(\\d+)`)); return m ? Number(m[1]) : null; };
  const matches = n('M'), goals = n('G'), assists = n('A');
  return matches === null || goals === null ? null : { matches, goals, assists: assists ?? 0 };
}

export async function syncSoccer() {
  const started = Date.now();
  let clubs = 0, players = 0, leaders = 0;
  const known = new Map<number, string>();
  for (const lg of SOCCER_LEAGUES) {
    const t = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.key}/teams`);
    const teams: J[] = t?.sports?.[0]?.leagues?.[0]?.teams?.map((x: J) => x.team) ?? [];
    for (const team of teams) {
      const id = Number(team.id);
      if (!id) continue;
      await db.insert(schema.soccerClubs).values({ id, league: lg.key, name: team.displayName, shortName: team.shortDisplayName ?? null, abbreviation: team.abbreviation ?? '', color: team.color ? `#${team.color}` : null, logoUrl: team.logos?.[0]?.href ?? null })
        .onConflictDoUpdate({ target: schema.soccerClubs.id, set: { league: lg.key, name: team.displayName, shortName: team.shortDisplayName ?? null, abbreviation: team.abbreviation ?? '', color: team.color ? `#${team.color}` : null, logoUrl: team.logos?.[0]?.href ?? null, updatedAt: new Date() } });
      clubs++;
      const r = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.key}/teams/${id}/roster`);
      for (const a of (r?.athletes ?? []) as J[]) {
        const pid = Number(a.id), pos = a.position?.abbreviation;
        if (!pid || !a.displayName || !['G', 'D', 'M', 'F'].includes(pos)) continue;
        const row = { id: pid, name: a.displayName, clubId: id, league: lg.key, position: pos, age: typeof a.age === 'number' ? a.age : null, nationality: a.citizenship ?? null, jersey: a.jersey ?? null };
        await db.insert(schema.soccerPlayers).values(row).onConflictDoUpdate({ target: schema.soccerPlayers.id, set: { ...row, updatedAt: new Date() } });
        known.set(pid, a.displayName);
        players++;
      }
    }
    // Leaders: last completed season and the current one.
    const now = currentSeason(lg.key);
    for (const season of [now - 1, now]) {
      const L = await get(`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${lg.key}/seasons/${season}/types/1/leaders?limit=50`);
      const rows = new Map<number, { goals: number; assists: number; matches: number; clubId: number | null }>();
      for (const cat of (L?.categories ?? []) as J[]) {
        if (!['goalsLeaders', 'assistsLeaders'].includes(cat.name)) continue;
        for (const x of (cat.leaders ?? []) as J[]) {
          const pid = idFromRef(x.athlete?.$ref, 'athletes'), parsed = parseLeaderLine(x.shortDisplayValue);
          if (!pid || !parsed) continue;
          rows.set(pid, { ...parsed, clubId: idFromRef(x.team?.$ref, 'teams') });
        }
      }
      for (const [pid, v] of rows) {
        let name = known.get(pid);
        if (!name) { const a = await get(`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${lg.key}/athletes/${pid}`); name = a?.displayName; }
        if (!name) continue;
        await db.insert(schema.soccerLeaders).values({ season, league: lg.key, playerId: pid, name, clubId: v.clubId, goals: v.goals, assists: v.assists, matches: v.matches })
          .onConflictDoUpdate({ target: [schema.soccerLeaders.season, schema.soccerLeaders.league, schema.soccerLeaders.playerId], set: { name, clubId: v.clubId, goals: v.goals, assists: v.assists, matches: v.matches } });
        leaders++;
      }
    }
  }
  // Players who left a synced club since the last run are dropped (their club no longer lists them).
  const removed = await db.delete(schema.soccerPlayers).where(dsql`${schema.soccerPlayers.updatedAt} < now() - interval '3 days'`).returning({ id: schema.soccerPlayers.id });
  const summary = { clubs, players, leaders, removed: removed.length, ms: Date.now() - started };
  console.log('[soccer] synced', JSON.stringify(summary));
  return summary;
}

/** Spot check for the logs: a big club's roster size and the top scorer last season. */
export async function soccerSpotCheck() {
  const [c] = await db.execute<{ n: number }>(dsql`select count(*)::int as n from soccer_players p join soccer_clubs c on c.id = p.club_id where c.name ilike '%Manchester City%'`);
  const [top] = await db.execute<{ name: string; goals: number; season: number }>(dsql`select name, goals, season from soccer_leaders where league = 'eng.1' and season = ${currentSeason('eng.1') - 1} order by goals desc limit 1`);
  console.log('[soccer] spot check', JSON.stringify({ manCityPlayers: c?.n ?? 0, plTopScorerLastSeason: top ?? null }));
}
