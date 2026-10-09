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
import { syncFantasy } from '@/lib/server/sleeper';
import { tuneFantasyFloor } from '@/lib/server/calibrate';

/** Fantasy points, then a fresh fantasy win line fitted to them. Never fails the ratings sync. */
/** 82-0 history, a spot check of a famous season, then a fresh win line. Never fails the ratings sync. */
const refreshNba = (recentOnly: boolean) => import('@/lib/server/nba-sync')
  .then(async (m) => { await m.rescoreNba(); await m.syncNba(recentOnly ? { from: m.latestSeason() - 1 } : {}); await m.nbaSpotCheck(); })
  .then(() => import('@/lib/server/nba2k')).then((k) => k.sync2k().catch((e) => console.warn('[2k] sync failed', (e as Error).message)))
  .then(() => import('@/lib/server/nba-calibrate')).then(async (c) => { await c.tuneNbaFloor(); await c.tune2kFloor(); })
  .catch((e) => console.warn('[nba] refresh failed', (e as Error).message));
/** All-time: NFL history backfill (only missing seasons are fetched), legends rebuilt against today's grades, then fresh All-time win lines. */
const refreshLegends = (fetchHistory: boolean) => import('@/lib/server/nfl-history')
  .then(async (m) => { if (fetchHistory) await m.syncNflHistory(); await m.buildLegends(); await m.legendsSpotCheck('SF'); await m.legendsSpotCheck('DET'); })
  .then(() => import('@/lib/server/calibrate')).then((c) => c.tuneAllTimeFloors())
  .catch((e) => console.warn('[nfl-history] refresh failed', (e as Error).message));
/** 162-0: MLB history backfill (only missing seasons; the latest two always refresh) and a spot check. */
const refreshMlb = () => import('@/lib/server/mlb-sync').then(async (m) => { await m.syncMlb(); await m.mlbSpotCheck(); })
  .then(() => import('@/lib/server/mlb-calibrate')).then((c) => c.tuneMlbFloor())
  .catch((e) => console.warn('[mlb] refresh failed', (e as Error).message));
const refreshFantasy = () => syncFantasy().then(() => tuneFantasyFloor()).catch((e) => console.warn('[fantasy] refresh failed', (e as Error).message));

if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0 });

const connection = getRedis();
const concurrency = { [QUEUE_NAMES.sync]: 1, [QUEUE_NAMES.newsletter]: 5, [QUEUE_NAMES.og]: 2 };

const handlers: Record<string, (job: Job) => Promise<unknown>> = {
  [QUEUE_NAMES.sync]: async (job) => {
    // Owner buttons on /owner queue single refreshes by name; anything else is the full ratings sync.
    if (job.name === 'fantasy') return refreshFantasy();
    if (job.name === 'nba') return refreshNba(false);
    if (job.name === 'legends') return refreshLegends(true);
    if (job.name === 'mlb') return refreshMlb();
    if (job.name === 'pickem') return import('@/lib/server/pickem').then((m) => m.syncPickem());
    const summary = await runSync({ dryRun: false });
    await backfillEspnHeadshots().catch((e) => console.warn('[espn] backfill failed', e.message));
    await recomputeCoachImpact().catch((e) => console.warn('[coaches] recompute failed', e.message));
    // Fantasy points refresh on their own schedule (after game days), not with the daily ratings sync.
    await refreshNba(true);
    // New ratings move the grade range legends are placed on, so rebuild them (no ESPN fetch) and re-fit.
    await refreshLegends(false);
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
  if (process.env.SYNC_ON_BOOT === '1') {
    await getQueue(QUEUE_NAMES.sync).add('sync', { by: 'boot' }, { attempts: 1 }).catch(() => {});
  }
  await backfillEspnHeadshots().catch((e) => console.warn('[espn] backfill failed', e.message));
  await recomputeCoachImpact().catch((e) => console.warn('[coaches] recompute failed', e.message));
  await refreshFantasy();
  // 82-0: backfill NBA seasons in the background (resumes where it stopped; the newest seasons always refresh), then re-fit the win line.
  void refreshNba(false);
  void refreshLegends(true);
  void refreshMlb();
  // Soccer: clubs, rosters and season leaders from ESPN, at boot and daily.
  const soccer = () => import('@/lib/server/soccer-sync').then(async (m) => { await m.syncSoccer(); await m.soccerSpotCheck(); }).catch((e) => console.warn('[soccer] sync failed', (e as Error).message));
  void soccer();
  setInterval(() => void soccer(), 24 * 3600_000);
  // Pick 'em: this week's NFL games and results, every 20 minutes (finished games pay out on each run).
  const pickem = () => import('@/lib/server/pickem').then((m) => m.syncPickem()).catch((e) => console.warn('[pickem] sync failed', (e as Error).message));
  void pickem();
  setInterval(() => void pickem(), 20 * 60_000);
  // Shop launch: points for every ranked game played before the shop existed (once; idempotent).
  void import('@/lib/server/points').then((p) => p.backfillPoints()).then((n) => console.log('[points] launch backfill paid', n)).catch((e) => console.warn('[points] backfill failed', (e as Error).message));
  if (process.env.CALIBRATE === '1') {
    const { calibrate } = await import('@/lib/server/calibrate');
    for (const f of ['6', '12', '16'] as const) await calibrate(f).catch((e) => console.warn('[calibrate]', e.message));
  }
  await fetch(`${process.env.INTERNAL_WEB_URL ?? 'http://localhost:3000'}/api/internal/revalidate`, { method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }).catch(() => {});
})();

async function shutdown() {
  clearInterval(beat);
  await Promise.allSettled(workers.map((w) => w.close()));
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
