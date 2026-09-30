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
      const main = async () => (await pg.evaluate(() => (document.querySelector('main') ?? document.body).innerText)).replace(/\s+/g, ' ');
      const chunks = (tag: string, t: string) => { for (let i = 0; i < Math.min(t.length, 9000); i += 1500) console.log(`[stm4] ${tag} ${i}: ${t.slice(i, i + 1500)}`); };
      for (const url of ['https://sticktothemodel.com/games/build-a-17-0-team', 'https://sticktothemodel.com/games/build-a-player']) {
        await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await pg.waitForTimeout(6000);
        chunks(`page ${url}`, await main());
      }
      await pg.goto('https://sticktothemodel.com/games/build-a-17-0-team', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await pg.waitForTimeout(6000);
      for (let step = 0; step < 14; step++) {
        const spin = pg.locator('button:visible').filter({ hasText: /spin|start|play the season|simulate|sim|next|reveal/i }).first();
        if (await spin.count()) {
          const label = (await spin.textContent())?.trim();
          await spin.click().catch(() => {});
          const frames: string[] = [];
          for (let f = 0; f < 8; f++) { await pg.waitForTimeout(300); const t = await main(); frames.push(t.slice(t.search(/spin|team|round/i), t.search(/spin|team|round/i) + 160)); }
          console.log(`[stm5] step${step} clicked "${label}" frames=${JSON.stringify(frames)}`);
          await pg.waitForTimeout(2500);
        } else {
          const cand = pg.locator('button:visible').filter({ hasText: /[A-Z][a-z]+ [A-Z]/ });
          const n = await cand.count();
          const labels = await cand.evaluateAll((els) => els.map((e) => (e.textContent || '').trim().slice(0, 60)).slice(0, 30));
          console.log(`[stm5] step${step} choices(${n})=${JSON.stringify(labels)}`);
          const skip = /spin|sign|menu|search|upgrade|share|nfl|college|current|all-time|games|draft|fantasy|betting/i;
          let clicked = false;
          for (let i = 0; i < n && !clicked; i++) { const t = (await cand.nth(i).textContent()) ?? ''; if (!skip.test(t)) { await cand.nth(i).click().catch(() => {}); clicked = true; console.log(`[stm5] picked ${t.slice(0, 60)}`); } }
          await pg.waitForTimeout(1500);
        }
        const t = await main();
        const i = t.search(/Build a 17-0 Team/);
        console.log(`[stm5] step${step} state=${t.slice(Math.max(0, i), i + 1400)}`);
        if (/went \d+-\d+|\d+-\d+ season|final record/i.test(t) && step > 6) { chunks('result', t.slice(i)); break; }
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
