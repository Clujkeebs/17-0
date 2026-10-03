/**
 * One-off probe (removed once soccer is built): what ESPN's public soccer endpoints return, so the soccer games
 * are built only on fields that exist. Logs one [soccer-probe] summary line per endpoint.
 */
type J = Record<string, any>;
const get = async (url: string): Promise<J | null> => {
  try { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } }); return r.ok ? ((await r.json()) as J) : { status: r.status }; } catch (e) { return { error: (e as Error).message }; }
};
const log = (what: string, x: unknown) => console.log('[soccer-probe]', what, JSON.stringify(x).slice(0, 1500));

export async function soccerProbe() {
  const leagues = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'usa.1', 'uefa.champions', 'fifa.world'];
  for (const lg of leagues) {
    const t = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/teams`);
    const teams = t?.sports?.[0]?.leagues?.[0]?.teams ?? [];
    log(`${lg} teams`, { n: teams.length, first: teams[0]?.team ? { id: teams[0].team.id, name: teams[0].team.displayName, abbr: teams[0].team.abbreviation, logo: teams[0].team.logos?.[0]?.href, color: teams[0].team.color } : t });
  }
  const t = await get('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams');
  const id = t?.sports?.[0]?.leagues?.[0]?.teams?.[0]?.team?.id ?? '359';
  const roster = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/${id}/roster`);
  const ath = roster?.athletes ?? [];
  log('roster', { n: ath.length, keys: Object.keys(ath[0] ?? {}), sample: ath[0] ? { id: ath[0].id, name: ath[0].displayName, pos: ath[0].position?.abbreviation, age: ath[0].age, jersey: ath[0].jersey, citizenship: ath[0].citizenship, headshot: ath[0].headshot?.href, stats: ath[0].statistics ? Object.keys(ath[0].statistics) : null } : roster });
  const aid = ath.find((a: J) => a.position?.abbreviation === 'F')?.id ?? ath[0]?.id;
  if (aid) {
    log('athlete stats', await get(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/eng.1/athletes/${aid}/stats`));
    log('athlete overview', await get(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/eng.1/athletes/${aid}/overview`));
    log('athlete core', await get(`https://sports.core.api.espn.com/v2/sports/soccer/leagues/eng.1/athletes/${aid}`));
  }
  log('leaders', await get('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/statistics'));
  log('core leaders', await get('https://sports.core.api.espn.com/v2/sports/soccer/leagues/eng.1/seasons/2025/types/1/leaders'));
  log('standings', await get('https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings'));
}
