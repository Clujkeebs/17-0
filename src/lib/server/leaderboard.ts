import { and, asc, desc, eq, inArray, isNotNull, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { cached } from './redis';
import { allTimePointsExpr } from './leaderboard-sql';
import { scoreSummary } from './result-summary';
import { dailyDateET } from '@/lib/game/daily';
import { isOwnerEmail, resolveStyle, type NameStyle } from '@/lib/cosmetics';

/** Name styles for the players on a page, in one query. Emails stay here; only the resolved style leaves. */
async function stylesFor(userIds: string[]): Promise<Map<string, NameStyle>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await db.select({ id: schema.users.id, email: schema.users.email, font: schema.users.nameFont, color: schema.users.nameColor })
    .from(schema.users).where(inArray(schema.users.id, ids));
  return new Map(rows.map((r) => [r.id, resolveStyle({ font: r.font, color: r.color }, isOwnerEmail(r.email))]));
}

export interface DailyRow { rank: number; username: string; score: number; summary: string; createdAt: string; resultId: string; hard: boolean; style?: NameStyle; date?: string }

export async function dailyLeaderboard(gameType: string, date = dailyDateET(), limit = 100, hardOnly = false): Promise<DailyRow[]> {
  return cached(`lb:daily:${gameType}:${date}${hardOnly ? ':hard' : ''}`, 60, async () => {
    // Best result per user for the day; ties broken by earliest submission.
    const rows = await db.execute<{ id: string; user_id: string; username: string; score: number; result_data: Record<string, unknown>; created_at: string }>(dsql`
      select distinct on (user_id) id, user_id, coalesce(username, 'anonymous') as username, score, result_data, created_at
      from game_results
      where game_type = ${gameType} and daily_date = ${date} and is_daily and user_id is not null and not flagged
        ${hardOnly ? dsql`and coalesce((result_data->>'hard')::boolean, false)` : dsql``}
      order by user_id, score desc, created_at asc`);
    const top = [...rows]
      .sort((a, b) => b.score - a.score || +new Date(a.created_at) - +new Date(b.created_at))
      .slice(0, limit);
    const styles = await stylesFor(top.map((r) => r.user_id));
    return top.map((r, i) => ({ rank: i + 1, username: r.username, score: r.score, summary: scoreSummary(gameType, r.result_data), createdAt: new Date(r.created_at).toISOString(), resultId: r.id, hard: r.result_data?.hard === true, style: styles.get(r.user_id) }));
  });
}

export type Period = 'today' | 'week' | 'all';
export const PERIODS: Period[] = ['today', 'week', 'all'];

/**
 * One game's board for a period: each player's best ranked (Today) result in it. Today is today's puzzle;
 * This week is the last seven daily puzzles; All time is every daily puzzle ever. Every game stores a score
 * where higher is better (timed games store a score that rises as the time falls), so one order fits all.
 */
export async function gameLeaderboard(gameType: string, period: Period, hardOnly = false, limit = 100): Promise<DailyRow[]> {
  if (period === 'today') return dailyLeaderboard(gameType, undefined, limit, hardOnly);
  const today = dailyDateET();
  const since = period === 'week' ? new Date(Date.parse(`${today}T12:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10) : '2000-01-01';
  return cached(`lb:${period}:${gameType}:${today}${hardOnly ? ':hard' : ''}`, 300, async () => {
    const rows = await db.execute<{ id: string; user_id: string; username: string; score: number; result_data: Record<string, unknown>; created_at: string; daily_date: string }>(dsql`
      select distinct on (user_id) id, user_id, coalesce(username, 'anonymous') as username, score, result_data, created_at, daily_date
      from game_results
      where game_type = ${gameType} and is_daily and daily_date >= ${since} and user_id is not null and not flagged
        ${hardOnly ? dsql`and coalesce((result_data->>'hard')::boolean, false)` : dsql``}
      order by user_id, score desc, created_at asc`);
    const top = [...rows].sort((a, b) => b.score - a.score || +new Date(a.created_at) - +new Date(b.created_at)).slice(0, limit);
    const styles = await stylesFor(top.map((r) => r.user_id));
    return top.map((r, i) => ({ rank: i + 1, username: r.username, score: r.score, summary: scoreSummary(gameType, r.result_data), createdAt: new Date(r.created_at).toISOString(), resultId: r.id, hard: r.result_data?.hard === true, style: styles.get(r.user_id), date: String(r.daily_date) }));
  });
}

export interface AllTimeRow { rank: number; username: string; points: number; games: number; best: number; style?: NameStyle }

/** All-time: points accumulate across every graded game. 17-0 = wins, Build a Player = rating / 10. */
export async function allTimeLeaderboard(page = 1, perPage = 50): Promise<{ rows: AllTimeRow[]; total: number }> {
  return cached(`lb:all:${page}`, 300, async () => {
    // Points expression lives in ./leaderboard-sql (pure, unit tested). It coalesces missing
    // wins/rating so mini-game-only players get 0 base points instead of a NULL that sorts first.
    const pointsExpr = allTimePointsExpr;
    const where = and(isNotNull(schema.gameResults.userId), eq(schema.gameResults.flagged, false));
    const rows = await db.select({
      userId: schema.gameResults.userId,
      username: dsql<string>`max(${schema.gameResults.username})`,
      points: pointsExpr,
      games: dsql<number>`count(*)::int`,
      best: dsql<number>`max(${schema.gameResults.score})::int`,
    }).from(schema.gameResults).where(where).groupBy(schema.gameResults.userId)
      .orderBy(desc(pointsExpr), asc(dsql`min(${schema.gameResults.createdAt})`)).limit(perPage).offset((page - 1) * perPage);
    const [t] = await db.select({ n: dsql<number>`count(distinct ${schema.gameResults.userId})::int` }).from(schema.gameResults).where(where);
    const styles = await stylesFor(rows.map((r) => r.userId ?? ''));
    return { rows: rows.map((r, i) => ({ rank: (page - 1) * perPage + i + 1, username: r.username ?? 'anonymous', points: r.points, games: r.games, best: r.best, style: styles.get(r.userId ?? '') })), total: t?.n ?? 0 };
  });
}

export async function getResult(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db.select().from(schema.gameResults).where(eq(schema.gameResults.id, id)).limit(1);
  return r ?? null;
}
