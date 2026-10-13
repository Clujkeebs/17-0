import { createHash } from 'node:crypto';
import { db, schema } from '@/db';
import { COACH_LEGENDS } from '@/lib/game/coach-legends';
import { CORE, franchiseMap, get, pool } from './nfl-history';
import { getRedis } from './redis';

/** A franchise's regular season record for one season, from ESPN: "10-6" or "10-5-1". */
async function seasonRecord(season: number, espnId: number, fetchImpl: typeof fetch): Promise<{ w: number; l: number; t: number } | null> {
  const j = await get(`${CORE}/seasons/${season}/types/2/teams/${espnId}/records/0`, fetchImpl, 2);
  const m = /^(\d+)-(\d+)(?:-(\d+))?$/.exec(String(j?.summary ?? ''));
  return m ? { w: Number(m[1]), l: Number(m[2]), t: Number(m[3] ?? 0) } : null;
}

/**
 * ESPN's own season records for these coaches add up to a different total than the coach's documented record, which was
 * summed season by season; the written numbers stand and the line logs `known` while ESPN keeps sending the same thing.
 */
const ESPN_QUIRKS: Record<string, string> = { 'johnson-dal': '44-34-0', 'cowher-pit': '148-90-1' };

/**
 * Checks each legendary coach's written record against ESPN's franchise records for the seasons he ran the team, and logs
 * one line each: `ok` (same), `partial` (ESPN lacks some seasons, so it can only rule out a record smaller than its own),
 * `known` (a quirk listed above) or `CHECK` (a real difference to fix in coach-legends.ts). Nothing is written. It runs
 * once for each version of the list, so editing the list re-checks it on the next worker start.
 */
export async function checkCoachLegends(fetchImpl: typeof fetch = fetch) {
  const version = createHash('md5').update(JSON.stringify(COACH_LEGENDS)).digest('hex').slice(0, 8);
  const lock = await getRedis().set(`coach-legends:checked:${version}`, '1', 'EX', 90 * 24 * 3600, 'NX').catch(() => 'OK');
  if (!lock) return;
  const [map, teams] = await Promise.all([franchiseMap(fetchImpl), db.select({ id: schema.teams.id, abbr: schema.teams.abbreviation }).from(schema.teams)]);
  const espnOf = new Map<string, number>();
  for (const [espn, ours] of map) { const t = teams.find((x) => x.id === ours); if (t) espnOf.set(t.abbr, espn); }
  let ok = 0, partial = 0, known = 0, off = 0, none = 0;
  for (const c of COACH_LEGENDS) {
    const espn = espnOf.get(c.team);
    if (!espn) { none++; console.log(`[coach-legends] no ESPN franchise for ${c.team} (${c.key})`); continue; }
    const seasons = c.years.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i));
    let w = 0, l = 0, t = 0, got = 0;
    await pool(seasons, 6, async (y) => { const r = await seasonRecord(y, espn, fetchImpl); if (r) { w += r.w; l += r.l; t += r.t; got++; } });
    const mine = `${c.w}-${c.l}-${c.t}`, theirs = `${w}-${l}-${t}`;
    const status = got === seasons.length ? (mine === theirs ? 'ok' : ESPN_QUIRKS[c.key] === theirs ? 'known' : 'CHECK') : w > c.w || l > c.l || t > c.t ? 'CHECK' : 'partial';
    if (status === 'ok') ok++; else if (status === 'partial') partial++; else if (status === 'known') known++; else off++;
    console.log(`[coach-legends] ${status} ${c.key} mine ${mine} espn ${theirs} (${got}/${seasons.length} seasons)`);
  }
  console.log(`[coach-legends] checked ${COACH_LEGENDS.length}: ${ok} match, ${known} known ESPN quirks, ${partial} partial (ESPN lacks seasons), ${off} differ, ${none} without a franchise`);
}
