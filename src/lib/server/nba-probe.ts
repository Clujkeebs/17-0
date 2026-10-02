/** Temporary: find an ESPN endpoint that lists who actually played in an old season, and for which team. */
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
type J = Record<string, unknown>;
async function get(url: string): Promise<J> {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<J>;
}
const log = (n: string, v: unknown) => console.log(`[nba-probe] ${n} :: ${JSON.stringify(v).slice(0, 700)}`);

export async function probeNbaSources() {
  const step = async (n: string, fn: () => Promise<unknown>) => { try { log(n, await fn()); } catch (e) { log(n, `FAILED ${(e as Error).message}`); } };
  await step('season-athletes-1996', async () => { const j = await get(`${CORE}/seasons/1996/athletes?limit=5`); return { count: j.count, items: j.items }; });
  await step('season-athletes-1996-active', async () => { const j = await get(`${CORE}/seasons/1996/athletes?limit=5&active=true`); return { count: j.count }; });
  await step('team-leaders-1996-4', async () => {
    const j = await get(`${CORE}/seasons/1996/types/2/teams/4/leaders`);
    return ((j.categories as { name: string; leaders: { athlete: { $ref: string }; value: number }[] }[]) ?? []).map((c) => ({ c: c.name, n: c.leaders.length, first: c.leaders[0]?.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1], v: c.leaders[0]?.value }));
  });
  await step('league-leaders-1996-100', async () => {
    const j = await get(`${CORE}/seasons/1996/types/2/leaders?limit=100`);
    const cats = (j.categories as { name: string; leaders: { athlete: { $ref: string }; team?: { $ref: string } }[] }[]) ?? [];
    return { cats: cats.length, perCat: cats.map((c) => `${c.name}:${c.leaders.length}`).slice(0, 12), sample: cats[0]?.leaders.slice(0, 2) };
  });
  await step('athlete-2008-1966-team', async () => { const j = await get(`${CORE}/seasons/2008/athletes/1966`); return { team: j.team, teams: j.teams }; });
  await step('athlete-2011-1966-team', async () => { const j = await get(`${CORE}/seasons/2011/athletes/1966`); return { team: j.team }; });
  await step('team-1996-4-athletes-first3', async () => {
    const j = await get(`${CORE}/seasons/1996/teams/4/athletes?limit=3`);
    return j.items;
  });
  await step('team-roster-site-1996', async () => {
    const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/4/roster?season=1996', { signal: AbortSignal.timeout(20_000) });
    const j = await r.json() as J;
    return { status: r.status, n: (j.athletes as unknown[])?.length, first: ((j.athletes as { displayName: string }[]) ?? []).slice(0, 4).map((a) => a.displayName), season: j.season };
  });
}
