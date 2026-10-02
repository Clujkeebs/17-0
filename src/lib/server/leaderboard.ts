import { and, asc, desc, eq, isNotNull, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { cached } from './redis';
import { allTimePointsExpr } from './leaderboard-sql';
import { scoreSummary } from './result-summary';
import { dailyDateET } from '@/lib/game/daily';

export interface DailyRow { rank: number; username: string; score: number; summary: string; createdAt: string; resultId: string; hard: boolean }

export async function dailyLeaderboard(gameType: string, date = dailyDateET(), limit = 100, hardOnly = false): Promise<DailyRow[]> {
  return cached(`lb:daily:${gameType}:${date}${hardOnly ? ':hard' : ''}`, 60, async () => {
    // Best result per user for the day; ties broken by earliest submission.
    const rows = await db.execute<{ id: string; username: string; score: number; result_data: Record<string, unknown>; created_at: string }>(dsql`
      select distinct on (user_id) id, coalesce(username, 'anonymous') as username, score, result_data, created_at
      from game_results
      where game_type = ${gameType} and daily_date = ${date} and is_daily and user_id is not null and not flagged
        ${hardOnly ? dsql`and coalesce((result_data->>'hard')::boolean, false)` : dsql``}
      order by user_id, score desc, created_at asc`);
    return [...rows]
      .sort((a, b) => b.score - a.score || +new Date(a.created_at) - +new Date(b.created_at))
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, username: r.username, score: r.score, summary: scoreSummary(gameType, r.result_data), createdAt: new Date(r.created_at).toISOString(), resultId: r.id, hard: r.result_data?.hard === true }));
  });
}

export interface AllTimeRow { rank: number; username: string; points: number; games: number; best: number }

/** All-time: points accumulate across every graded game. 17-0 = wins, Build a Player = rating / 10. */
export async function allTimeLeaderboard(page = 1, perPage = 50): Promise<{ rows: AllTimeRow[]; total: number }> {
  return cached(`lb:all:${page}`, 300, async () => {
    // Points expression lives in ./leaderboard-sql (pure, unit tested). It coalesces missing
    // wins/rating so mini-game-only players get 0 base points instead of a NULL that sorts first.
    const pointsExpr = allTimePointsExpr;
    const where = and(isNotNull(schema.gameResults.userId), eq(schema.gameResults.flagged, false));
    const rows = await db.select({
      username: dsql<string>`max(${schema.gameResults.username})`,
      points: pointsExpr,
      games: dsql<number>`count(*)::int`,
      best: dsql<number>`max(${schema.gameResults.score})::int`,
    }).from(schema.gameResults).where(where).groupBy(schema.gameResults.userId)
      .orderBy(desc(pointsExpr), asc(dsql`min(${schema.gameResults.createdAt})`)).limit(perPage).offset((page - 1) * perPage);
    const [t] = await db.select({ n: dsql<number>`count(distinct ${schema.gameResults.userId})::int` }).from(schema.gameResults).where(where);
    return { rows: rows.map((r, i) => ({ rank: (page - 1) * perPage + i + 1, username: r.username ?? 'anonymous', points: r.points, games: r.games, best: r.best })), total: t?.n ?? 0 };
  });
}

export async function getResult(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db.select().from(schema.gameResults).where(eq(schema.gameResults.id, id)).limit(1);
  return r ?? null;
}
