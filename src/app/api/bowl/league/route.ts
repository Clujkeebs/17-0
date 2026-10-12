export const runtime = 'nodejs';

import { errorJson, json } from '@/lib/server/request';
import { leagueSeed } from '@/lib/server/bowl';

/** Real rosters to start a GM league from. Public and cached; the league itself lives with the player. */
export async function GET() {
  try {
    const seed = await leagueSeed();
    if (seed.teams.length < 8) return errorJson(503, 'Rosters are still loading. Try again in a few minutes.');
    return json(seed, { cacheSeconds: 600 });
  } catch {
    return errorJson(503, 'Could not load rosters.');
  }
}
