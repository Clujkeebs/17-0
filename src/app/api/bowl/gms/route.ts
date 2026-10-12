export const runtime = 'nodejs';

import { json } from '@/lib/server/request';
import { gmRankings } from '@/lib/server/bowl';

/** GM rankings: most titles, then most wins. */
export async function GET() {
  return json({ rows: await gmRankings().catch(() => []) }, { cacheSeconds: 60 });
}
