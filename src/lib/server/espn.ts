import { and, eq, isNull, or } from 'drizzle-orm';
import { db, schema } from '@/db';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '').replace(/[^a-z]/g, '');

interface EspnAthlete { id: string; fullName: string; headshot?: { href?: string } }

/**
 * Backfills ESPN athlete IDs and headshot URLs by matching our players to ESPN team rosters by name.
 * Public, unauthenticated ESPN site API. Safe to re-run; only fills rows that are missing an image.
 */
export async function backfillEspnHeadshots(fetchImpl: typeof fetch = fetch) {
  const teams = await db.select().from(schema.teams);
  let matched = 0, scanned = 0;
  for (const t of teams) {
    const code = t.logoUrl?.match(/\/nfl\/500\/([a-z]+)\.png/)?.[1] ?? t.abbreviation.toLowerCase();
    let athletes: EspnAthlete[] = [];
    try {
      const res = await fetchImpl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${code}/roster`, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { console.warn(`[espn] ${code} ${res.status}`); continue; }
      const body = (await res.json()) as { athletes?: { items?: EspnAthlete[] }[] };
      athletes = (body.athletes ?? []).flatMap((g) => g.items ?? []);
    } catch (e) { console.warn(`[espn] ${code} failed`, (e as Error).message); continue; }
    const byName = new Map(athletes.map((a) => [norm(a.fullName), a]));
    const players = await db.select({ id: schema.players.id, fullName: schema.players.fullName }).from(schema.players)
      .where(and(eq(schema.players.teamId, t.id), or(isNull(schema.players.imageUrl), isNull(schema.players.espnId))));
    for (const p of players) {
      scanned++;
      const a = byName.get(norm(p.fullName));
      if (!a) continue;
      const img = a.headshot?.href ?? `https://a.espncdn.com/i/headshots/nfl/players/full/${a.id}.png`;
      await db.update(schema.players).set({ espnId: a.id, imageUrl: img }).where(eq(schema.players.id, p.id));
      matched++;
    }
  }
  console.log(`[espn] headshots matched ${matched}/${scanned}`);
  return { matched, scanned };
}
