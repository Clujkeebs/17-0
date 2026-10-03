/**
 * Temporary: checks the data sources planned for the next phases from the worker (the dev container cannot reach
 * them) and logs what each returns. Remove once each source is wired or ruled out.
 */
type J = Record<string, unknown>;
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; UnbeatenBot/1.0; +https://playunbeaten.com)' };
const log = (n: string, v: unknown) => console.log(`[probe] ${n} :: ${typeof v === 'string' ? v : JSON.stringify(v)}`.slice(0, 1200));

async function text(url: string, headers: Record<string, string> = UA) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), headers });
  return { status: r.status, type: r.headers.get('content-type') ?? '', body: await r.text() };
}

export async function probeSources() {
  const step = async (n: string, fn: () => Promise<unknown>) => { try { log(n, await fn()); } catch (e) { log(n, `FAILED ${(e as Error).message}`); } };

  // 2K ratings (owner-suggested source): robots rules first, then the page itself.
  await step('2klab-robots', async () => { const r = await text('https://www.nba2klab.com/robots.txt'); return `${r.status} ${r.body.replace(/\s+/g, ' ').slice(0, 700)}`; });
  await step('2klab-page', async () => {
    const r = await text('https://www.nba2klab.com/nba2k-player-ratings');
    const nums = (r.body.match(/\b(9[0-9]|8[0-9])\b/g) ?? []).length;
    return { status: r.status, type: r.type, bytes: r.body.length, nextData: r.body.includes('__NEXT_DATA__'), hasLeBron: /LeBron/i.test(r.body), hasJokic: /Joki/i.test(r.body), ratingLikeNumbers: nums, title: r.body.match(/<title>([^<]*)/)?.[1], sample: r.body.replace(/\s+/g, ' ').slice(0, 300) };
  });
  await step('2klab-terms', async () => { const r = await text('https://www.nba2klab.com/terms-of-service'); return { status: r.status, scrape: /scrap|automated|crawl|robot/i.test(r.body), snippet: (r.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').match(/.{0,200}(scrap|automated|crawl|robot).{0,200}/i) ?? [''])[0] }; });

  // NFL history for All-time: one team-season's stat leaders and one season stat line.
  await step('espn-nfl-leaders-1995-gb', async () => {
    const r = await fetch('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/1995/types/2/teams/9/leaders', { signal: AbortSignal.timeout(20_000) });
    const j = (await r.json()) as J;
    return { status: r.status, cats: ((j.categories as { name: string; leaders: { athlete?: { $ref?: string }; value: number }[] }[]) ?? []).map((c) => `${c.name}:${c.leaders.length}:${c.leaders[0]?.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1]}:${c.leaders[0]?.value}`) };
  });
  await step('espn-nfl-leaders-1975-pit', async () => {
    const r = await fetch('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/1975/types/2/teams/23/leaders', { signal: AbortSignal.timeout(20_000) });
    const j = (await r.json()) as J;
    return { status: r.status, cats: ((j.categories as { name: string; leaders: unknown[] }[]) ?? []).map((c) => `${c.name}:${c.leaders.length}`) };
  });
  await step('espn-nfl-stats-favre-1995', async () => {
    const r = await fetch('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/1995/types/2/athletes/1189/statistics', { signal: AbortSignal.timeout(20_000) });
    const j = (await r.json()) as J;
    const cats = ((j.splits as { categories?: { name: string; stats: { name: string; value: number }[] }[] })?.categories ?? []);
    return { status: r.status, cats: cats.map((c) => `${c.name}[${c.stats.slice(0, 8).map((s) => `${s.name}=${s.value}`).join(',')}]`) };
  });

  // MLB for 162-0.
  await step('mlb-teams-1998', async () => { const r = await text('https://statsapi.mlb.com/api/v1/teams?sportId=1&season=1998', {}); return { status: r.status, teams: (JSON.parse(r.body).teams ?? []).length }; });
  await step('mlb-roster-stats-1998-nyy', async () => {
    const r = await text('https://statsapi.mlb.com/api/v1/teams/147/roster?season=1998&rosterType=fullSeason&hydrate=person(stats(type=season,season=1998,group=[hitting,pitching]))', {});
    const roster = (JSON.parse(r.body).roster ?? []) as { person: { fullName: string; primaryPosition?: { abbreviation: string }; stats?: { group: { displayName: string }; splits: { stat: Record<string, unknown> }[] }[] } }[];
    const jeter = roster.find((x) => /Jeter/.test(x.person.fullName));
    return { status: r.status, players: roster.length, jeter: jeter ? { pos: jeter.person.primaryPosition?.abbreviation, stat: jeter.person.stats?.[0]?.splits?.[0]?.stat } : null };
  });

  // Soccer ratings (EA FC official site).
  await step('eafc-ratings', async () => { const r = await text('https://www.ea.com/games/ea-sports-fc/ratings'); return { status: r.status, bytes: r.body.length, nextData: r.body.includes('__NEXT_DATA__'), hasMbappe: /Mbapp/i.test(r.body) }; });
  await step('eafc-robots', async () => { const r = await text('https://www.ea.com/robots.txt'); return `${r.status} ${r.body.replace(/\s+/g, ' ').slice(0, 500)}`; });
}
