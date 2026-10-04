import { eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { GAMES } from '@/lib/game-registry';
import { EARN } from './points';
import { getPlayDates } from './account';
import { longestStreak } from '@/lib/game/daily';
import { earnedBadges, type BadgeFacts } from '@/lib/badges';

/** Gathers the facts badges are earned from: results by game, streak, and the points history. */
export async function badgeFacts(userId: string): Promise<BadgeFacts> {
  const [byGame, events, [u], dates] = await Promise.all([
    db.execute<{ game_type: string; n: number; perfect: number }>(dsql`
      select game_type, count(*)::int as n, count(*) filter (where
        (game_type = '17-0' and (result_data->>'wins')::int = 17) or
        (game_type = '82-0' and (result_data->>'wins')::int = 82) or
        (game_type = '162-0' and (result_data->>'wins')::int = 162) or
        (game_type = 'build-a-player' and (result_data->>'rating')::float >= 97) or
        (result_data->>'perfect') = 'true')::int as perfect
      from game_results where user_id = ${userId} group by game_type`),
    db.execute<{ reason: string; best: number; n: number }>(dsql`
      select reason, max(amount)::int as best, count(*)::int as n from point_events
      where user_id = ${userId} and reason in ('board', 'week', 'pickem-week', 'challenge-win') group by reason`),
    db.select({ earned: schema.users.pointsEarned }).from(schema.users).where(eq(schema.users.id, userId)),
    getPlayDates(userId),
  ]);
  const ev = new Map([...events].map((e) => [e.reason, e]));
  const sportOf = new Map(GAMES.map((g) => [g.slug, g.sport]));
  const board = ev.get('board');
  return {
    perfect: Object.fromEntries([...byGame].map((r) => [r.game_type, r.perfect])),
    played: [...byGame].reduce((s, r) => s + r.n, 0),
    sports: [...new Set([...byGame].map((r) => sportOf.get(r.game_type)).filter((s): s is NonNullable<typeof s> => !!s))],
    longestStreak: longestStreak(dates),
    // Daily board points fall with rank (EARN.board), so the biggest one paid tells the best finish.
    boardBest: board ? EARN.board.indexOf(board.best) + 1 || null : null,
    weekWins: ev.get('week')?.best === EARN.week[0] ? 1 : 0,
    pickemPerfectWeeks: ev.get('pickem-week')?.n ?? 0,
    challengeWins: ev.get('challenge-win')?.n ?? 0,
    pointsEarned: u?.earned ?? 0,
  };
}

export const badgesFor = async (userId: string) => earnedBadges(await badgeFacts(userId));
