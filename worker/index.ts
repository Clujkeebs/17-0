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
      await pg.getByText('Games', { exact: true }).first().hover().catch(() => {});
      await pg.getByText('Games', { exact: true }).first().click().catch(() => {});
      await pg.waitForTimeout(1500);
      const all = await pg.$$eval('a', (as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).href))]);
      const games = all.filter((h) => /game|17-0|spin|daily|grid|puzzle|trivia|play/i.test(h) && !/historical-games|all-games/.test(h));
      console.log(`[stm2] gameLinks=${JSON.stringify(games)}`);
      for (const g of games.slice(0, 8)) {
        await pg.goto(g, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
        const txt = (await pg.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText)).replace(/\s+/g, ' ');
        const i = txt.search(/17-0|spin|perfect season/i);
        console.log(`[stm2] ${g} :: ${i >= 0 ? txt.slice(Math.max(0, i - 300), i + 1500) : txt.slice(0, 400)}`);
      }
      const target = games.find((h) => /17/.test(h)) ?? games[0];
      if (target) {
        await pg.goto(target, { waitUntil: 'networkidle', timeout: 45_000 });
        const html = await pg.evaluate(() => (document.querySelector('main') ?? document.body).outerHTML);
        console.log(`[stm3] html=${html.replace(/\s+/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').slice(0, 6000)}`);
        for (let step = 0; step < 8; step++) {
          const btn = pg.locator('main button:visible').filter({ hasText: /spin|start|play|roll|draft|next|pick|sim/i }).first();
          const fallback = pg.locator('main button:visible').first();
          const use = (await btn.count()) ? btn : fallback;
          const label = (await use.textContent().catch(() => ''))?.trim();
          await use.click().catch(() => {});
          const frames: string[] = [];
          for (let f = 0; f < 6; f++) { await pg.waitForTimeout(350); frames.push((await pg.evaluate(() => (document.querySelector('main') ?? document.body).innerText)).replace(/\s+/g, ' ').slice(0, 220)); }
          console.log(`[stm3] step${step} clicked="${label}" frames=${JSON.stringify(frames)}`);
          await pg.waitForTimeout(1500);
          const txt = (await pg.evaluate(() => (document.querySelector('main') ?? document.body).innerText)).replace(/\s+/g, ' ').slice(0, 1800);
          const btns = await pg.$$eval('main button', (els) => els.map((e) => (e.textContent || '').trim()).filter(Boolean).slice(0, 40));
          console.log(`[stm3] step${step} after=${txt}`);
          console.log(`[stm3] step${step} buttons=${JSON.stringify(btns)}`);
          // If players are listed, pick the first player-like button.
          const player = pg.locator('main button:visible').filter({ hasText: /\b\d{2}\b/ }).first();
          if (await player.count()) { await player.click().catch(() => {}); await pg.waitForTimeout(800); }
        }
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
