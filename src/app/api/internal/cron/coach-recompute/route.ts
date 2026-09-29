import { recomputeCoachImpact } from '@/lib/server/coaches';
import { invalidatePrefix } from '@/lib/server/redis';
import { errorJson, json, requireCron } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!requireCron(req)) return errorJson(401, 'Unauthorized');
  const updated = await recomputeCoachImpact();
  await invalidatePrefix('coaches:').catch(() => {});
  return json({ updated });
}
