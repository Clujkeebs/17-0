import { sql as dsql } from 'drizzle-orm';
import { db } from '@/db';
import { describeStats, statsFromDist } from '@/lib/game/difficulty';

/** Season length for each draft game, keyed by game type. */
const GAMES: Record<string, number> = { '17-0': 17, '82-0': 82, '162-0': 162 };

/**
 * What players actually get, not what a simulated drafter gets: for each draft game and mode, how often real
 * Today and Casual runs went perfect and how they usually finished, over the last `days` days. One log line each.
 */
export async function logPlayerDifficulty(days = 30): Promise<void> {
  try {
    const rows = await db.execute<{ game: string; format: string; pool: string; edition: string; hard: boolean; wins: number; n: number }>(dsql`
      select game_type as game,
             coalesce(result_data->>'format', '') as format,
             coalesce(result_data->>'pool', result_data->>'mode', '') as pool,
             coalesce(result_data->>'edition', '') as edition,
             coalesce((result_data->>'hard')::boolean, false) as hard,
             (result_data->>'wins')::int as wins,
             count(*)::int as n
      from game_results
      where game_type in ('17-0', '82-0', '162-0') and not flagged and result_data ? 'wins'
        and created_at > now() - make_interval(days => ${days})
      group by 1, 2, 3, 4, 5, 6`);
    const groups = new Map<string, { game: string; dist: number[] }>();
    for (const r of rows) {
      const games = GAMES[r.game];
      if (!games || r.wins < 0 || r.wins > games) continue;
      const key = [r.game, r.format || '-', r.pool || '-', r.edition || '-', r.hard ? 'hard' : 'easy'].join(' ');
      const g = groups.get(key) ?? { game: r.game, dist: new Array<number>(games + 1).fill(0) };
      g.dist[r.wins] += r.n;
      groups.set(key, g);
    }
    for (const [key, g] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`[difficulty] players ${days}d`, key, describeStats(statsFromDist(g.dist, GAMES[g.game])));
    }
    if (!groups.size) console.log(`[difficulty] players ${days}d no finished runs`);
  } catch (e) { console.warn('[difficulty] player report failed', (e as Error).message); }
}
