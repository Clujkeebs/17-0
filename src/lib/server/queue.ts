import { Queue } from 'bullmq';
import { getRedis } from './redis';

export const QUEUE_NAMES = { sync: 'madden-sync', newsletter: 'newsletter', og: 'og-image' } as const;

const g = globalThis as unknown as { queues?: Record<string, Queue> };
export function getQueue(name: (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]): Queue {
  g.queues ??= {};
  g.queues[name] ??= new Queue(name, {
    connection: getRedis(),
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 500, removeOnFail: 1000 },
  });
  return g.queues[name];
}

export const enqueueSync = (by: string) => getQueue(QUEUE_NAMES.sync).add('sync', { by }, { attempts: 2, jobId: `sync-${new Date().toISOString().slice(0, 13)}-${by === 'cron' ? 'cron' : Date.now()}` });
export const enqueueOgImage = (resultId: string) => getQueue(QUEUE_NAMES.og).add('render', { resultId }, { attempts: 2 });
export const enqueueEmail = (kind: string, data: Record<string, unknown>) => getQueue(QUEUE_NAMES.newsletter).add(kind, data);
