import { allTimeLeaderboard } from '@/lib/server/leaderboard';
import { errorJson, json } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const page = Math.max(1, Math.min(1000, Number(new URL(req.url).searchParams.get('page')) || 1));
  try { return json({ page, perPage: 50, ...(await allTimeLeaderboard(page)) }, { cacheSeconds: 300 }); }
  catch { return errorJson(503, 'Leaderboard unavailable.'); }
}
