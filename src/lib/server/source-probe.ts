/** Temporary: maps ESPN's NFL history shape (leader categories, depth, team ids by season, athlete positions). Remove after. */
const log = (n: string, v: unknown) => console.log(`[probe] ${n} :: ${typeof v === 'string' ? v : JSON.stringify(v)}`.slice(0, 2500));
const BASE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const get = async (u: string) => { const r = await fetch(u.replace('http://', 'https://'), { signal: AbortSignal.timeout(20_000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<any>; };

export async function probeSources() {
  const step = async (n: string, fn: () => Promise<unknown>) => { try { log(n, await fn()); } catch (e) { log(n, `FAILED ${(e as Error).message}`); } };
  for (const y of [1985, 2005]) {
    await step(`teams-${y}`, async () => {
      const j = await get(`${BASE}/seasons/${y}/teams?limit=50`);
      const out: string[] = [];
      for (const it of j.items ?? []) { const t = await get(it.$ref); out.push(`${t.id}:${t.abbreviation}:${t.location} ${t.name}`); }
      return out.join(' | ');
    });
  }
  await step('leaders-1994-sf', async () => {
    const j = await get(`${BASE}/seasons/1994/types/2/teams/25/leaders`);
    const cats = (j.categories ?? []).map((c: any) => ({ name: c.name, n: c.leaders?.length, top: c.leaders?.[0] ? { v: c.leaders[0].value, dv: c.leaders[0].displayValue, ath: c.leaders[0].athlete?.$ref } : null }));
    return cats;
  });
  await step('athlete-1994-rice', async () => {
    const j = await get(`${BASE}/seasons/1994/athletes/1717`);
    return { name: j.fullName, pos: j.position?.abbreviation, headshot: j.headshot?.href, keys: Object.keys(j) };
  });
}
