# Decisions

Non-obvious calls made while building Unbeaten, one paragraph each. Newest at the bottom.

**Drizzle over Prisma.** Drizzle has no query-engine binary. That keeps the Docker image small, cold starts fast, and avoids a Rust engine download through restrictive build proxies. It also bundles into the worker with esbuild. Migrations live in `drizzle/` and run on web boot (`node migrate.mjs && node server.js`). Drizzle migrations are idempotent, so running them from every replica is safe.

**JWT sessions, not database sessions.** Auth.js v5 does not support database sessions with the Credentials provider. The session is a JWT stored in an httpOnly, `secure` (in production), `sameSite=lax` cookie. The JWT callback re-reads the user row on each refresh, so a deleted account is logged out on its next request. OAuth account links still use the Drizzle adapter tables.

**Tables named `user_accounts`, `auth_accounts`, `auth_sessions`, `auth_verification_tokens`.** The spec calls for `user_accounts`. The Auth.js adapter tables get an `auth_` prefix so the two are never confused.

**Client never sees raw attributes in 17-0.** The spin API returns names, positions and OVR only. Grading happens on the server from database attributes, so a tampered client cannot inflate a score. Build a Player has to show attribute values to be playable, so that game sends only the 8 to 10 category values for eligible players. Those values are public on player pages anyway.

**The reel is pre-determined.** The six teams are drawn in order from a PRNG seeded by the session, and the reel reveals them one at a time. The UI no longer offers re-spins. Grading rejects picks from teams that are not in the session, so the board is deterministic, auditable, and the same for every daily player.

**Each position maps to exactly one slot.** QB goes to QB, RB to RB, WR to WR, TE to TE, every defensive group to DEF, and coaches to HC. Kickers and punters are not draftable. Clicking a player drafts them straight into their slot. That removes a tap on mobile, and the slot bar still filters the list. Picking a second player from the same team replaces the first, because the rule is one pick per team.

**Daily results depend on the roster, not the session.** For daily games, the grading seed is the date seed plus the sorted pick IDs. Two people who draft the same six players get the same record, which keeps the daily leaderboard fair. Practice games are seeded by session ID, as the spec says.

**Leaderboard score encoding.** 17-0 is scored `wins * 1000 + round(team_strength * 10)`, so wins dominate and strength breaks ties. Remaining ties go to the earliest submission. Build a Player is scored `round(rating * 10)`. All-time points are one per 17-0 win plus rating divided by ten per build, so both games count on a comparable scale. Only signed-in players appear, since the spec says accounts unlock leaderboard placement. Anonymous results are still stored and shareable.

**Anti-cheat flagging threshold.** A result is flagged when a user with 10 or more results would be above 90 percent perfect: 17-0 records, or 97+ builds. Flagged results are hidden from leaderboards until an admin clears them in `/admin/results`.

**Projected record formula.** `wins = round((strength - 60) / 27 * 17 + jitter(-2..1))`, clamped 0 to 17 (`WIN_FLOOR`, `WIN_SPAN`). A roster at 84.7 goes 17-0 with the best roll, and 89.4 or above goes 17-0 with any roll. Calibrated so a well-drafted roster runs the table roughly one time in eleven: rare, but not a lottery ticket.

**Build a Player uses weighted traits.** Each position has five traits (`TRAITS` in `src/lib/game/build.ts`), each built from one or two attributes with a fixed weight. One spin fills one trait from one player. The score is the weighted sum, and the result also shows the best possible score from the same five teams, so a build is judged against its board.

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

**Format switched to the StickToTheModel style (2026-09).** 17-0 now matches sticktothemodel.com: one reel that spins one team at a time, six slots (QB, RB, WR, TE, DEF, HC), no kicker, no WR/TE flex, no re-spins. Weights are QB 25, DEF 20, RB 15, WR 15, HC 15, TE 10. Reasons: seeing one team at a time turns every pick into a real decision about what is still to come; the kicker slot was a 5 percent afterthought that added a tap without adding a choice; splitting WR and TE removes a flex slot that always went to the receiver; and re-spins let players dodge the hard part of the board. Build a Player moved to the same one-team-at-a-time reel with five weighted traits per position, so both games teach the same skill. Ratings are EA Sports Madden NFL 27, updated weekly, and rosters and head coaches follow ESPN team rosters.

**Slot weights follow real positional value (2026-10).** 17-0 weights changed from QB 25, DEF 20, RB 15, WR 15, HC 15, TE 10 to QB 30, WR 22, RB 18, DEF 13, HC 9, TE 8. Under the old weights a 97 receiver with a 90 tight end and the reverse were worth almost the same record (a quarter of a win apart on average), which read as wrong: receivers and backs touch the ball far more than a tight end, and a coach matters less than the quarterback. Now that swap is worth about two thirds of a win on average and usually a full game. The win floor moved from 67 to 67.25 (span stays 26) so a greedy draft still goes 17-0 about 12 percent of the time and a random one about never. The seed publishes the new weights as a new `17-0/slot_weights` version on boot, but only if the stored weights were never edited by an admin.

**Roster sizes and player pools (2026-10).** 17-0 has three roster formats: the classic six (QB, RB, WR, TE, DEF, HC), a 12-man roster that adds a second receiver, an offensive lineman and one slot for each defensive group, and a 16-man roster with three receivers, three linemen and two corners. Each has its own weights (summing to 1, quarterback heaviest, tight end and coach light) and its own win floor (6: 67.25, 12: 67.75, 16: 68.1) so a perfect greedy draft goes 17-0 about 12 percent of the time in every format; bigger rosters average out weak spots and needed a higher floor. Linemen now have their own blocking formula instead of borrowing the tight end's. All-time mode puts each of the 22 legends on the board of the franchise they are most identified with (`src/lib/game/legends.ts`). Today stays classic six, current players, so the ranked board is one shared puzzle; roster size and pool are Casual choices. Hard mode hides overalls, drafts by typing names, and has no re-rolls.

**Profiles and name styles (2026-10).** Profile pictures are resized to 160px squares in the browser and stored as small data URLs on the user row (no object storage needed; the server accepts only JPEG, PNG or WebP data URLs under about 90 KB). Name styles are cosmetic rewards for the longest daily streak, so they reward coming back rather than winning. The owner style is decided on the server from the account email and is deliberately absent from the unlock lists, so it cannot be earned, equipped or forged through the API; "owner" is a reserved word in usernames and display names, and display names cannot contain square brackets. The header profile button is a small client component so every page can stay static. Public profiles are opt-in by sharing and kept out of search results.
