/**
 * One-off reachability check for 82-0 (NBA) data sources, run from the worker because the dev container cannot
 * reach sports APIs. Logs status, size and a short sample of each so the build can rest on what actually answers.
 */
const PROBES: { name: string; url: string; headers?: Record<string, string>; look?: RegExp }[] = [
  { name: 'espn-teams', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams' },
  { name: 'espn-roster-now', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13/roster' },
  { name: 'espn-roster-1996-bulls', url: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/1996/teams/4/athletes?limit=30' },
  { name: 'espn-season-stats-1996', url: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/1996/types/2/athletes/1035/statistics' },
  { name: 'espn-career-stats', url: 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/1966/stats' },
  { name: 'espn-season-leaders-1986', url: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/1986/types/2/leaders' },
  { name: '2kratings-team', url: 'https://www.2kratings.com/teams/los-angeles-lakers', look: /overall|rating|"ovr"/i },
  { name: 'nba-stats', url: 'https://stats.nba.com/stats/leaguedashplayerstats?Season=2025-26&SeasonType=Regular%20Season&PerMode=PerGame&MeasureType=Base&LeagueID=00&PlayerOrTeam=Player', headers: { referer: 'https://www.nba.com/', origin: 'https://www.nba.com', 'x-nba-stats-origin': 'stats', 'x-nba-stats-token': 'true' } },
  { name: 'nba-cdn-players', url: 'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json' },
  { name: 'sleeper-nba', url: 'https://api.sleeper.app/v1/state/nba' },
];

export async function probeNbaSources(fetchImpl: typeof fetch = fetch) {
  for (const p of PROBES) {
    try {
      const r = await fetchImpl(p.url, { signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; UnbeatenBot/1.0; +https://playunbeaten.com)', ...p.headers } });
      const body = await r.text();
      const sample = body.replace(/\s+/g, ' ').slice(0, 220);
      const hit = p.look ? ` look=${p.look.test(body)}` : '';
      console.log(`[nba-probe] ${p.name} ${r.status} ${r.headers.get('content-type') ?? ''} ${body.length}b${hit} :: ${sample}`);
    } catch (e) {
      console.log(`[nba-probe] ${p.name} FAILED ${(e as Error).message}`);
    }
  }
}
