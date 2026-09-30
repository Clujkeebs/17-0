# Decisions

Non-obvious calls made while building Unbeaten, one paragraph each. Newest at the bottom.

**Drizzle over Prisma.** Drizzle has no query-engine binary. That keeps the Docker image small, cold starts fast, and avoids a Rust engine download through restrictive build proxies. It also bundles into the worker with esbuild. Migrations live in `drizzle/` and run on web boot (`node migrate.mjs && node server.js`). Drizzle migrations are idempotent, so running them from every replica is safe.

**JWT sessions, not database sessions.** Auth.js v5 does not support database sessions with the Credentials provider. The session is a JWT stored in an httpOnly, `secure` (in production), `sameSite=lax` cookie. The JWT callback re-reads the user row on each refresh, so a deleted account is logged out on its next request. OAuth account links still use the Drizzle adapter tables.

**Tables named `user_accounts`, `auth_accounts`, `auth_sessions`, `auth_verification_tokens`.** The spec calls for `user_accounts`. The Auth.js adapter tables get an `auth_` prefix so the two are never confused.

**Client never sees raw attributes in 17-0.** The spin API returns names, positions and OVR only. Grading happens on the server from database attributes, so a tampered client cannot inflate a score. Build a Player has to show attribute values to be playable, so that game sends only the 8 to 10 category values for eligible players. Those values are public on player pages anyway.

**Re-spins are pre-determined.** Each spin draws the six teams plus two reserve teams from a PRNG seeded by the session. A re-spin swaps an undrafted team for the next reserve. Drafted teams are locked because the UI only offers re-spin on undrafted cards, and grading rejects picks from teams that are no longer in the session. This keeps re-spins deterministic and auditable, and it is the same for every daily player.

**Each position maps to exactly one slot.** QB goes to QB, RB to RB, WR and TE to WR/TE, every defensive group to DEF, K and P to K, and coaches to HC. Clicking a player drafts them straight into their slot. That removes a tap on mobile, and the slot bar still filters the list. Picking a second player from the same team replaces the first, because the rule is one pick per team.

**Daily results depend on the roster, not the session.** For daily games, the grading seed is the date seed plus the sorted pick IDs. Two people who draft the same six players get the same record, which keeps the daily leaderboard fair. Practice games are seeded by session ID, as the spec says.

**Leaderboard score encoding.** 17-0 is scored `wins * 1000 + round(team_strength * 10)`, so wins dominate and strength breaks ties. Remaining ties go to the earliest submission. Build a Player is scored `round(rating * 10)`. All-time points are one per 17-0 win plus rating divided by ten per build, so both games count on a comparable scale. Only signed-in players appear, since the spec says accounts unlock leaderboard placement. Anonymous results are still stored and shareable.

**Anti-cheat flagging threshold.** A result is flagged when a user with 10 or more results would be above 90 percent perfect: 17-0 records, or 97+ builds. Flagged results are hidden from leaderboards until an admin clears them in `/admin/results`.

**Projected record formula kept exactly as specified.** With `wins = round(strength / 99 * 14 + jitter(-2..3))`, going 17-0 needs a team strength around 92 or better plus a lucky jitter. That makes a perfect season rare, which is the point of the game's name.

**Build a Player rating fills gaps.** Some formula inputs (Release for WR, for example) are not among the categories the player chooses. Those inputs are filled with the average of the chosen values, so the formula does not punish a build for an attribute it could never pick.

**Seed data until the first sync.** The sandbox this was built in cannot reach EA's ratings endpoint, so the database ships with a hand-built seed of real players and approximate ratings (`data/seed`, version `seed-2027`). Attributes are generated deterministically so each formula rating lands near the listed overall. The first successful sync matches rows by slug and replaces them with live data. The stale-ratings banner appears automatically if a sync has not succeeded in 7 days.

**Ratings sync prefers EA's public JSON endpoint and falls back to Playwright.** The JSON endpoint is faster and less brittle than scraping rendered HTML. Playwright stays in the worker image for the fallback and for snapshotting. Raw payloads are stored in `sync_snapshots` and on the worker volume for 30 days.

**One cron service, time-dispatched.** Railway runs one cron service every 15 minutes (`scripts/cron.mjs`). The script decides which internal endpoints are due: sync at 10:00 UTC (6 AM ET during DST), coach recompute Mondays at 11:00 UTC, maintenance at 08:00 UTC, and queue health on every run. That is one service instead of four. A separate cron service runs the nightly `pg_dump` to R2, because it needs `pg_dump` and different credentials.

**Queue health uses a worker heartbeat.** The worker writes `worker:heartbeat` to Redis every 30 seconds. The queue-health cron emails `ADMIN_EMAILS` if the heartbeat is older than 5 minutes or any queue backs up past 500 waiting jobs.

**Share cards render on the web service.** The `og-image` queue pre-warms each result's card by requesting it right after grading, so the first social crawler hit is fast. Rendering stays in one place (`next/og`) instead of being duplicated in the worker. Satori cannot read woff2, so static `@fontsource` woff files are copied into the web image for rendering.

**Input borders use `--steel-hi` (#718096).** Steel on navy is 2.48:1, which fails the WCAG 1.4.11 minimum of 3:1 for component boundaries. Decorative dividers stay steel. Inputs, buttons and pick buttons use the lifted tint, which is still within the steel hue family.

**Analytics are first-party counters.** `/api/events` increments Redis counters per day and event name. It stores no IP, no user ID, and no cookie. That meets the spec's "no third-party trackers" requirement and keeps the privacy policy honest.

**Rate limits fail open.** If Redis is down, rate limiting allows the request instead of blocking play. Server-side score validation still runs, so a Redis outage cannot be used to cheat, only to submit more often.

**Cookie names.** Auth.js v5 uses `authjs.session-token` (`__Secure-` prefixed in production), not the `next-auth.session-token` the spec mentions. The cookie policy lists the real names.

**Fonts via `next/font/local`.** The `@fontsource-variable` CSS imports caused a 0.21 CLS because the footer moved when Inter swapped in. The same Latin variable woff2 files now load through `next/font/local`, which preloads them and generates metric-matched fallbacks. CLS is 0.000 on every audited page.

**Hover lift only on fine pointers.** The 2px hover translate made tap targets jitter on touch devices, and Playwright caught it as "element not stable". The lift now applies only under `@media (hover: hover) and (pointer: fine)`.

**Rules card hidden before paint.** A tiny inline script in the game layout sets `data-rules="hidden"` on `<html>` when the rules were dismissed earlier. CSS hides the card before the first paint, so returning players see no layout shift.

**Leaderboard cache cleared on signed-in results.** Without this, a player could wait up to a minute to see themselves on the board. Grading a signed-in result now clears the daily and all-time leaderboard cache keys.

**The cache layer uses its own fail-fast Redis client.** The BullMQ connection has to queue commands indefinitely, which would hang page renders during a Redis outage. The cache client uses `enableOfflineQueue: false` and a 500 ms command timeout.

**Register never auto signs in.** Signing in automatically would reveal whether the email already existed. Every registration shows the same success message. An existing email gets a notice email instead of a second account.

**Sync safety rails beyond spec.** The sync aborts if the feed has duplicate IDs, or if it is smaller than half of the active players from a real sync. That stops a truncated feed from deactivating the league. Seed rows (`seed-2027`) are never overwritten by a re-seed once a real sync has replaced them. Slugs stay stable across syncs, so URLs never break.

**Compare URLs are canonicalized alphabetically.** `/compare/b-vs-a` permanently redirects to `/compare/a-vs-b`, so there is one indexable URL per pair.

**Only the current season page is indexable.** We store one ratings edition. Earlier `/seasons/[year]` pages exist for navigation but are `noindex`, to avoid thin content.

**Offensive linemen are graded with the TE formula as a proxy.** Linemen are not draftable in either game. Position pages say so.
