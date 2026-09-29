import { createRequire as __glCreateRequire } from 'module'; const require = __glCreateRequire(import.meta.url);

// scripts/cron.mjs
var base = process.env.INTERNAL_WEB_URL ?? "http://localhost:3000";
var secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET missing");
  process.exit(1);
}
var now = /* @__PURE__ */ new Date();
var h = now.getUTCHours();
var m = now.getUTCMinutes();
var dow = now.getUTCDay();
var first = m < 15;
var jobs = ["queue-health"];
if (h === 10 && first) jobs.push("madden-sync");
if (dow === 1 && h === 11 && first) jobs.push("coach-recompute");
if (h === 8 && first) jobs.push("maintenance");
var forced = process.argv[2];
if (forced) jobs.splice(0, jobs.length, forced);
var failed = false;
for (const job of jobs) {
  try {
    const res = await fetch(`${base}/api/internal/cron/${job}`, { method: "POST", headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12e4) });
    console.log(job, res.status, (await res.text()).slice(0, 500));
    if (!res.ok) failed = true;
  } catch (e) {
    console.error(job, "failed", e.message);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
//# sourceMappingURL=cron.mjs.map
