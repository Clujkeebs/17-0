import * as Sentry from '@sentry/node';
import { Worker, type Job } from 'bullmq';
import { getRedis } from '@/lib/server/redis';
import { QUEUE_NAMES } from '@/lib/server/queue';
import { runSync } from '@/lib/server/sync';
import { alertAdmins } from '@/lib/server/alert';
import { dispatchEmailJob } from '@/lib/server/email-jobs';
import { renderResultCard } from './og';
import { backfillEspnHeadshots } from '@/lib/server/espn';
import { recomputeCoachImpact } from '@/lib/server/coaches';
import { getQueue } from '@/lib/server/queue';

if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0 });

const connection = getRedis();
const concurrency = { [QUEUE_NAMES.sync]: 1, [QUEUE_NAMES.newsletter]: 5, [QUEUE_NAMES.og]: 2 };

const handlers: Record<string, (job: Job) => Promise<unknown>> = {
  [QUEUE_NAMES.sync]: async () => {
    const summary = await runSync({ dryRun: false });
    await backfillEspnHeadshots().catch((e) => console.warn('[espn] backfill failed', e.message));
    await recomputeCoachImpact().catch(() => {});
    console.log('[sync] done', JSON.stringify(summary).slice(0, 600));
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
  if (process.env.PROBE_STM === '1') {
    try {
      const { chromium } = await import('playwright-core');
      const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
      const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
      const log = async (tag: string) => {
        const txt = (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 3000);
        const btns = await pg.$$eval('button, a, [role=button]', (els) => els.map((e) => (e.textContent || '').trim()).filter(Boolean).slice(0, 40));
        console.log(`[stm] ${tag} url=${pg.url()} text=${txt}`);
        console.log(`[stm] ${tag} buttons=${JSON.stringify(btns)}`);
      };
      await pg.goto('https://sticktothemodel.com', { waitUntil: 'networkidle', timeout: 60_000 });
      await log('home');
      const styles = await pg.evaluate(() => { const cs = getComputedStyle(document.body); return { bg: cs.backgroundColor, color: cs.color, font: cs.fontFamily }; });
      console.log(`[stm] styles=${JSON.stringify(styles)}`);
      const links = await pg.$$eval('a', (as) => as.map((a) => (a as HTMLAnchorElement).href).slice(0, 40));
      console.log(`[stm] links=${JSON.stringify(links)}`);
      for (const label of [/17-0|nfl|football/i, /play|start|spin/i, /spin|roll/i]) {
        const el = pg.getByRole('button', { name: label }).or(pg.getByRole('link', { name: label })).first();
        if (await el.count()) { await el.click().catch(() => {}); await pg.waitForTimeout(3500); await log(`after ${label}`); }
      }
      for (let i = 0; i < 3; i++) {
        const any = pg.locator('button:visible').nth(1);
        if (await any.count()) { await any.click().catch(() => {}); await pg.waitForTimeout(3500); await log(`click${i}`); }
      }
      await b.close();
    } catch (e) { console.log('[stm] failed', (e as Error).message); }
  }
  if (process.env.SYNC_ON_BOOT === '1') {
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
