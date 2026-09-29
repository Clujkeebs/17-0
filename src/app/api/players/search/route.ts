import { searchPlayers } from '@/lib/server/data';
import { json, errorJson } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return json({ q, results: [] }, { cacheSeconds: 3600 });
  try {
    const results = await searchPlayers(q, 10);
    return json({ q, results }, { cacheSeconds: 3600 });
  } catch (e) {
    console.error('[api/players/search]', e);
    return errorJson(503, 'Search is temporarily unavailable');
  }
}
