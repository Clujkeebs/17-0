import { getQueue, QUEUE_NAMES } from '@/lib/server/queue';
import { getRedis } from '@/lib/server/redis';
import { errorJson, json, requireCron } from '@/lib/server/request';
import { alertSlack } from '@/lib/server/alert';

export const runtime = 'nodejs';

/** Verifies the worker is alive (heartbeat key) and queues are draining. Alerts Slack otherwise. */
export async function POST(req: Request) {
  if (!requireCron(req)) return errorJson(401, 'Unauthorized');
  const r = getRedis();
  const beat = Number(await r.get('worker:heartbeat')) || 0;
  const workerAlive = Date.now() - beat < 5 * 60_000;
  const queues: Record<string, Record<string, number>> = {};
  for (const name of Object.values(QUEUE_NAMES)) queues[name] = await getQueue(name).getJobCounts('waiting', 'active', 'failed', 'delayed');
  const backlog = Object.values(queues).some((c) => (c.waiting ?? 0) > 500);
  const ok = workerAlive && !backlog;
  if (!ok) await alertSlack(`Queue health: worker ${workerAlive ? 'alive' : 'SILENT'}, backlog ${backlog ? 'HIGH' : 'ok'}. ${JSON.stringify(queues)}`);
  return json({ ok, workerAlive, queues }, { status: ok ? 200 : 503 });
}
