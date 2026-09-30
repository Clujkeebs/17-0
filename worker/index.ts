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
    const cands = ['https://drop-api.ea.com/rating/madden-nfl-27', 'https://drop-api.ea.com/rating/madden-nfl?iteration=launch', 'https://drop-api.ea.com/rating/madden-nfl-26'];
    for (const c of cands) {
      try {
        const u = new URL(c); u.searchParams.set('locale', 'en'); u.searchParams.set('limit', '2');
        const r = await fetch(u, { headers: { accept: 'application/json' } });
        const t = await r.text();
        console.log(`[probe2] ${u} -> ${r.status} ${t.slice(0, 600).replace(/"playerAbilities":\[.*?\]\s*,/g, '')}`);
      } catch (e) { console.log(`[probe2] ${c} error ${(e as Error).message}`); }
    }
    try {
      const { chromium } = await import('playwright-core');
      const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
      const pg = await b.newPage();
      const seen: string[] = [];
      pg.on('request', (req) => { const u = req.url(); if (/drop-api|rating/i.test(u) && !/\.(png|jpg|svg|webp|css|js)(\?|$)/.test(u)) seen.push(u); });
      await pg.goto('https://www.ea.com/games/madden-nfl/ratings', { waitUntil: 'networkidle', timeout: 60_000 }).catch((e) => console.log('[probe3] goto', e.message));
      console.log(`[probe3] title=${await pg.title()} requests=${JSON.stringify([...new Set(seen)].slice(0, 25))}`);
      const links = await pg.$$eval('a', (as) => as.map((a) => (a as HTMLAnchorElement).href).filter((h) => /rating/.test(h)).slice(0, 30)).catch(() => []);
      console.log(`[probe3] links=${JSON.stringify(links)}`);
      await b.close();
    } catch (e) { console.log('[probe3] browser failed', (e as Error).message); }
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
