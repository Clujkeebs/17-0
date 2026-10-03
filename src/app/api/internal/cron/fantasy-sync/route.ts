import { getQueue, QUEUE_NAMES } from '@/lib/server/queue';
import { errorJson, json, requireCron } from '@/lib/server/request';

export const runtime = 'nodejs';

/** Fantasy points refresh, after each NFL game day (Mon, Tue and Fri mornings ET). The worker does the work. */
export async function POST(req: Request) {
  if (!requireCron(req)) return errorJson(401, 'Unauthorized');
  const job = await getQueue(QUEUE_NAMES.sync).add('fantasy', { by: 'cron' }, { attempts: 2, backoff: { type: 'exponential', delay: 60_000 } });
  return json({ queued: true, jobId: job.id });
}
