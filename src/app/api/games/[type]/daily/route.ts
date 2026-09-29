import { isGameType, publicTeams } from '@/lib/server/games';
import { errorJson, json } from '@/lib/server/request';
import { dailyDateET, dailySeed } from '@/lib/game/daily';
import { getTeams } from '@/lib/server/data';
import { createRng } from '@/lib/game/prng';
import { TEAMS_PER_GAME } from '@/lib/game/seventeen';

export const runtime = 'nodejs';

/** Preview of today's six teams. Same for everyone, resets at midnight ET. */
export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isGameType(type) || type !== '17-0') return errorJson(404, 'Daily puzzle is available for 17-0.');
  try {
    const date = dailyDateET();
    const ids = (await getTeams()).map((t) => t.id).sort((a, b) => a - b);
    const order = createRng(`spin:${dailySeed('17-0:', date)}`).shuffle(ids).slice(0, TEAMS_PER_GAME);
    const teams = (await publicTeams(order, '17-0')).map(({ players: _p, ...t }) => t);
    return json({ date, teams }, { cacheSeconds: 60 });
  } catch {
    return errorJson(503, 'Daily puzzle unavailable.');
  }
}
