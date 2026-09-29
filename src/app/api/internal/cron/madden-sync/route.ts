import { enqueueSync } from '@/lib/server/queue';
import { errorJson, json, requireCron } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!requireCron(req)) return errorJson(401, 'Unauthorized');
  const job = await enqueueSync('cron');
  return json({ queued: true, jobId: job.id });
}
