import * as Sentry from '@sentry/node';
import { Worker, type Job } from 'bullmq';
import { getRedis } from '@/lib/server/redis';
import { QUEUE_NAMES } from '@/lib/server/queue';
import { runSync } from '@/lib/server/sync';
import { alertAdmins } from '@/lib/server/alert';
import { dispatchEmailJob } from '@/lib/server/email-jobs';
import { renderResultCard } from './og';
import { backfillEspnHeadshots } from '@/lib/server/espn';
import { fetchJsonPages } from '@/lib/server/sync/fetch';
import { getQueue } from '@/lib/server/queue';

if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0 });

const connection = getRedis();
const concurrency = { [QUEUE_NAMES.sync]: 1, [QUEUE_NAMES.newsletter]: 5, [QUEUE_NAMES.og]: 2 };

const handlers: Record<string, (job: Job) => Promise<unknown>> = {
  [QUEUE_NAMES.sync]: async () => {
    const summary = await runSync({ dryRun: false });
    // Fresh ratings: purge the web service's ISR pages so player pages update now, not in a day.
    const base = process.env.INTERNAL_WEB_URL ?? 'http://localhost:3000';
    await fetch(`${base}/api/internal/revalidate`, { method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }).catch(() => {});
    return summary;
  },
  [QUEUE_NAMES.newsletter]: async (job) => dispatchEmailJob(job.name, job.data),
  [QUEUE_NAMES.og]: async (job) => renderResultCard(job.data.resultId),
};

const workers = Object.entries(handlers).map(([name, fn]) => {
  const w = new Worker(name, fn, { connection, concurrency: concurrency[name as keyof typeof concurrency] ?? 1 });
  w.on('failed', (job, err) => {
    console.error(`[${name}] job ${job?.id} failed:`, err.message);
    Sentry.captureException(err, { tags: { queue: name } });
    if (name === QUEUE_NAMES.sync && job && job.attemptsMade >= (job.opts.attempts ?? 1)) void alertAdmins('Ratings sync failed', `Ratings sync failed: ${err.message}`);
  });
  w.on('completed', (job) => console.log(`[${name}] job ${job.id} done`));
  return w;
});

const beat = setInterval(() => void connection.set('worker:heartbeat', String(Date.now()), 'EX', 600).catch(() => {}), 30_000);
void connection.set('worker:heartbeat', String(Date.now()), 'EX', 600);
console.log('worker started:', Object.keys(handlers).join(', '));

// Boot tasks: probe the ratings feed shape (logged for parser debugging), kick a sync, backfill headshots.
void (async () => {
  if (process.env.PROBE_EA === '1') {
    for (const pageUrl of ['https://www.ea.com/games/madden-nfl/player-ratings', 'https://www.ea.com/games/madden-nfl/player-ratings?page=2']) {
      try {
        const r = await fetch(pageUrl, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', accept: 'text/html' } });
        const html = await r.text();
        const apis = [...new Set(html.match(/https?:\/\/[a-z0-9.-]*(?:drop-api|api|ratings)[a-z0-9.-]*\.[a-z]+[^"'\s<>\\)]{0,160}/gi) ?? [])].slice(0, 30);
        const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]{0,2500})/)?.[1] ?? '';
        const idx = html.search(/overallRating|"ovr"|firstName/);
        console.log(`[probe4] ${pageUrl} status=${r.status} len=${html.length} apis=${JSON.stringify(apis)}`);
        console.log(`[probe4] nextdata=${nd.slice(0, 2500)}`);
        console.log(`[probe4] around=${idx >= 0 ? html.slice(Math.max(0, idx - 800), idx + 1500) : 'none'}`);
      } catch (e) { console.log('[probe4] failed', (e as Error).message); }
    }
  }
  if (process.env.SYNC_ON_BOOT === '1') {
    try {
      const probe = await fetchJsonPages(undefined, async (u, init) => { const r = await fetch(u, init); return r; });
      const page = probe.pages[0] as { items?: Record<string, unknown>[] } & Record<string, unknown>;
      const it = page.items?.[0] ?? {};
      console.log(`[probe] items=${probe.itemCount} pageKeys=${Object.keys(page).join(',')} itemKeys=${Object.keys(it).join(',')}`);
      console.log(`[probe] iterations=${JSON.stringify((it.availableIterations as { id: string; label: string }[] | undefined)?.map((x) => `${x.id}=${x.label}`))}`);
      console.log(`[probe] iteration=${JSON.stringify(it.iteration)} team=${JSON.stringify(it.team)} position=${JSON.stringify(it.position)}`);
      console.log(`[probe] stats=${JSON.stringify(it.stats).slice(0, 1500)}`);
      const meta = Object.fromEntries(Object.entries(page).filter(([k]) => k !== 'items'));
      console.log(`[probe] meta=${JSON.stringify(meta).slice(0, 1500)}`);
    } catch (e) { console.warn('[probe] ratings feed failed:', (e as Error).message); }
    await getQueue(QUEUE_NAMES.sync).add('sync', { by: 'boot' }, { attempts: 1 }).catch(() => {});
  }
  await backfillEspnHeadshots().catch((e) => console.warn('[espn] backfill failed', e.message));
})();

async function shutdown() {
  clearInterval(beat);
  await Promise.allSettled(workers.map((w) => w.close()));
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
