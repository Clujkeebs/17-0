import { sql as dsql } from 'drizzle-orm';
import { db } from '@/db';

/** How many rows the college sync has stored per league, cached a minute (a league with nothing yet is looked at again in ten seconds). The hub shows a league's games once it has data. */
let cache: { at: number; ready: boolean; counts: Record<string, number> } | null = null;
export async function collegeCounts(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < (cache.ready ? 60_000 : 10_000)) return cache.counts;
  const counts: Record<string, number> = { cfb: 0, mbb: 0, wbb: 0 };
  try {
    const rows = await db.execute<{ league: string; n: number }>(dsql`
      select league, count(*)::int as n from (select league from college_leaders union all select league from college_hoops) x group by league`);
    for (const r of rows) counts[r.league] = r.n;
  } catch { /* tables not there yet: nothing is ready */ }
  cache = { at: Date.now(), ready: Object.values(counts).every((n) => n >= COLLEGE_MIN), counts };
  return counts;
}
/** Enough rows to build puzzles: football leaders and basketball lines. */
export const COLLEGE_MIN = 400;
