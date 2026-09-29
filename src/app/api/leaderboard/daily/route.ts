import { dailyLeaderboard } from '@/lib/server/leaderboard';
import { errorJson, json } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const game = u.searchParams.get('game') === 'build-a-player' ? 'build-a-player' : '17-0';
  try { return json({ game, rows: await dailyLeaderboard(game) }, { cacheSeconds: 60 }); }
  catch { return errorJson(503, 'Leaderboard unavailable.'); }
}
