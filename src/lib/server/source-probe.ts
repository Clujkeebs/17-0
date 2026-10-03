/** Temporary: maps the data shapes for 2K ratings, EA FC ratings and how far back ESPN's NFL leaders go. Remove after. */
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; UnbeatenBot/1.0; +https://playunbeaten.com)' };
const log = (n: string, v: unknown) => console.log(`[probe] ${n} :: ${typeof v === 'string' ? v : JSON.stringify(v)}`.slice(0, 1500));

/** Finds the first array of objects anywhere in a JSON tree whose length is at least `min`, with its path. */
function findArray(node: unknown, min: number, path = ''): { path: string; arr: unknown[] } | null {
  if (Array.isArray(node)) {
    if (node.length >= min && node.every((x) => x && typeof x === 'object')) return { path, arr: node };
    for (let i = 0; i < Math.min(node.length, 5); i++) { const r = findArray(node[i], min, `${path}[${i}]`); if (r) return r; }
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) { const r = findArray(v, min, `${path}.${k}`); if (r) return r; }
  }
  return null;
}
const nextData = (html: string) => JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? 'null');

export async function probeSources() {
  const step = async (n: string, fn: () => Promise<unknown>) => { try { log(n, await fn()); } catch (e) { log(n, `FAILED ${(e as Error).message}`); } };
  await step('2klab-shape', async () => {
    const html = await (await fetch('https://www.nba2klab.com/nba2k-player-ratings', { headers: UA, signal: AbortSignal.timeout(20_000) })).text();
    const nd = nextData(html);
    const hit = findArray(nd, 100);
    return { path: hit?.path, count: hit?.arr.length, first: hit?.arr[0], keys: hit ? Object.keys(hit.arr[0] as object) : null };
  });
  await step('eafc-shape', async () => {
    const html = await (await fetch('https://www.ea.com/games/ea-sports-fc/ratings', { headers: UA, signal: AbortSignal.timeout(20_000) })).text();
    const nd = nextData(html);
    const hit = findArray(nd, 50);
    return { path: hit?.path, count: hit?.arr.length, keys: hit ? Object.keys(hit.arr[0] as object) : null, first: JSON.stringify(hit?.arr[0]).slice(0, 700) };
  });
  for (const y of [1980, 1985, 1990, 2000]) {
    await step(`espn-nfl-leaders-${y}`, async () => {
      const r = await fetch(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${y}/types/2/teams/9/leaders`, { signal: AbortSignal.timeout(20_000) });
      return r.status;
    });
  }
  await step('espn-nfl-athlete-1995-112', async () => {
    const r = await fetch('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/1995/athletes/112', { signal: AbortSignal.timeout(20_000) });
    const j = (await r.json()) as Record<string, unknown>;
    return { status: r.status, name: j.fullName, pos: (j.position as { abbreviation?: string })?.abbreviation, headshot: (j.headshot as { href?: string })?.href };
  });
}
