import { dailyDateET } from '@/lib/game/daily';
import { awardDailyBoards, awardWeek } from '@/lib/server/points';
import { errorJson, json, requireCron } from '@/lib/server/request';

export const runtime = 'nodejs';

/**
 * Nightly (05:00 UTC, after midnight ET): points for yesterday's top 10 on every daily board, and on Mondays
 * the weekly podium for Monday to Sunday. Grants are idempotent, so a re-run pays nothing twice.
 */
export async function POST(req: Request) {
  if (!requireCron(req)) return errorJson(401, 'Unauthorized');
  const yesterday = dailyDateET(new Date(Date.now() - 24 * 3600_000));
  const boards = await awardDailyBoards(yesterday);
  let week = 0;
  const y = new Date(`${yesterday}T12:00:00Z`);
  if (y.getUTCDay() === 0) week = await awardWeek(new Date(y.getTime() - 6 * 86_400_000).toISOString().slice(0, 10));
  console.log('[points] awards', JSON.stringify({ date: yesterday, boards, week }));
  return json({ date: yesterday, boards, week });
}
