// Railway cron entry. Runs every 15 minutes, dispatches the jobs that are due, then exits.
// Schedules (UTC): madden-sync 10:00 daily (6 AM ET), coach-recompute Mondays 11:00, maintenance 08:00 daily, queue-health every run.
const base = process.env.INTERNAL_WEB_URL ?? 'http://localhost:3000';
const secret = process.env.CRON_SECRET;
if (!secret) { console.error('CRON_SECRET missing'); process.exit(1); }

const now = new Date();
const h = now.getUTCHours(), m = now.getUTCMinutes(), dow = now.getUTCDay();
const first = m < 15;
const jobs = ['queue-health'];
if (h === 10 && first) jobs.push('madden-sync');
if (dow === 1 && h === 11 && first) jobs.push('coach-recompute');
if (h === 8 && first) jobs.push('maintenance');
const forced = process.argv[2];
if (forced) jobs.splice(0, jobs.length, forced);

let failed = false;
for (const job of jobs) {
  try {
    const res = await fetch(`${base}/api/internal/cron/${job}`, { method: 'POST', headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(120_000) });
    console.log(job, res.status, (await res.text()).slice(0, 500));
    if (!res.ok) failed = true;
  } catch (e) { console.error(job, 'failed', e.message); failed = true; }
}
process.exit(failed ? 1 : 0);
