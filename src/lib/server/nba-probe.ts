/**
 * One-off look at ESPN's NBA core API shapes for 82-0, run from the worker because the dev container cannot
 * reach sports APIs. Logs the fields the sync will rely on. Remove once the NBA sync is written.
 */
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';

async function get(url: string, fetchImpl: typeof fetch) {
  const r = await fetchImpl(url.replace('http://', 'https://'), { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<Record<string, unknown>>;
}
const log = (name: string, v: unknown) => console.log(`[nba-probe] ${name} :: ${JSON.stringify(v).slice(0, 900)}`);

export async function probeNbaSources(fetchImpl: typeof fetch = fetch) {
  const step = async (name: string, fn: () => Promise<unknown>) => { try { log(name, await fn()); } catch (e) { log(name, `FAILED ${(e as Error).message}`); } };
  await step('site-default-ua', async () => (await fetchImpl('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams', { signal: AbortSignal.timeout(15_000) })).status);
  await step('seasons-index', async () => { const j = await get(`${CORE}/seasons?limit=100`, fetchImpl); return { count: j.count, first: (j.items as { $ref: string }[])?.slice(-3) }; });
  await step('teams-1996', async () => { const j = await get(`${CORE}/seasons/1996/teams?limit=50`, fetchImpl); return { count: j.count }; });
  await step('teams-2026', async () => { const j = await get(`${CORE}/seasons/2026/teams?limit=50`, fetchImpl); return { count: j.count }; });
  await step('teams-2027', async () => { const j = await get(`${CORE}/seasons/2027/teams?limit=50`, fetchImpl); return { count: j.count }; });
  await step('team-1996-4', async () => { const j = await get(`${CORE}/seasons/1996/teams/4`, fetchImpl); return { keys: Object.keys(j), id: j.id, displayName: j.displayName, abbreviation: j.abbreviation, location: j.location, name: j.name, color: j.color, logos: (j.logos as unknown[])?.slice(0, 1) }; });
  await step('team-1986-25', async () => { const j = await get(`${CORE}/seasons/1986/teams/25`, fetchImpl); return { displayName: j.displayName, abbreviation: j.abbreviation }; });
  await step('athlete-1996-1035', async () => {
    const j = await get(`${CORE}/seasons/1996/athletes/1035`, fetchImpl);
    return { keys: Object.keys(j), fullName: j.fullName, position: j.position, headshot: j.headshot, height: j.displayHeight, team: j.team, experience: j.experience };
  });
  await step('stats-1996-1035', async () => {
    const j = await get(`${CORE}/seasons/1996/types/2/athletes/1035/statistics`, fetchImpl);
    const cats = ((j.splits as { categories?: { name: string; stats: { name: string; value: number }[] }[] })?.categories ?? []);
    return cats.map((c) => ({ c: c.name, s: c.stats.map((s) => `${s.name}=${s.value}`).slice(0, 40) }));
  });
  await step('roster-2026-13', async () => { const j = await get(`${CORE}/seasons/2026/teams/13/athletes?limit=30`, fetchImpl); return { count: j.count }; });
  await step('roster-1986-2', async () => { const j = await get(`${CORE}/seasons/1986/teams/2/athletes?limit=30`, fetchImpl); return { count: j.count }; });
}
