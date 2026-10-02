# Unbeaten: handoff and to-do list

Live site: https://playunbeaten.com
Repo: github.com/clujkeebs/17-0, branch `main`. The working branch `gridiron-lab-build` is kept equal to `main`.

## What it is
NFL ratings game site built on Next.js 16 (App Router, standalone output), React 19, TypeScript, Drizzle with Postgres, Redis, BullMQ, NextAuth v5, Vitest and Playwright.

- **17-0:** spin a team, draft one player from it into an open slot, one team at a time, then simulate a season. A setup sheet opens first: Today (ranked) or Casual; a 6, 12 or 16 man roster; Current or All-time players (franchise legends join their team's board); Easy (overalls, 2 re-rolls) or Hard (type names, no overalls, no re-rolls). Today is always the 6-man board with current players. Formats live in `FORMATS` in `src/lib/game/seventeen.ts`.
- **Build a Player:** five spins, one trait each.
- **16 daily mini games:** Higher or Lower, Grid, Mystery Player, Where's He From, Blind Resume, Rating Match, Guess the Overall, Top Ten, Rank 'Em, Name That Team, Speed Trap, Odd One Out, Numbers Game, Size Up, Vet Check, Division Line.
- Every game has two modes: Today (ranked, account required, one try) and Casual (unlimited). Never call it "practice".
- Share sheet on every result (native share, copy link, copy text, SMS, X, Facebook, save image) and OG score cards.
- Ratings come from EA's Madden 27 ratings pages. ESPN supplies current rosters, headshots and head coaches.

## House rules
- No em-dashes. Dry voice. Custom SVG icons. Clean, premium, light design.
- No placeholders. Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).
- Mailing address: 12831 Muscatine Street, Suite A, Pacoima, CA 91331.
- Do not disguise the site's category or metadata to get past school filters (declined on purpose).

## Deploying (Railway project "unbeaten")
- Project `d6a0d144-b4a1-46ee-90ba-5adc85fa4e55`, environment `778c8a82-2002-455d-b720-d7386f22e6fa`.
- Services:
  - web `d2e53b77-afed-4af9-9d20-6a26d3c39e3d` (Dockerfile)
  - worker `702261d7-b927-42b5-a7bd-7a3dcc2be29d` (Dockerfile.worker)
  - cron `c0924f5d-bc9b-499c-b06c-229579b63b8e` (Dockerfile.cron)
  - Postgres and Redis plugins
- Pushing to GitHub does NOT auto-deploy. After a push, run the Railway MCP `connect-service-source` (repo `clujkeebs/17-0`, branch `main`) for each changed service, then check `list-deployments`.
- The worker runs the ESPN sync and coach recompute on boot. Redeploy it when you change `src/lib/server/coaches.ts` or `src/lib/server/espn.ts`.

## Local dev
- First run in a fresh container: `cp .env.example .env.local`, set the postgres password to `postgres`, `createdb gridiron`, then `npm run db:migrate && npm run db:seed` with `.env.local` exported.
- The standalone server needs `.next/static` and `public` copied into `.next/standalone/` (the Dockerfile does this). Make sure no older `next-server` is still on port 3000 before re-testing a new build.
- Cloud sessions cannot reach the live site or ESPN's CDN (egress is blocked), so team logos show blank locally and live checks go through Railway logs.
- Start the services: `service postgresql start; redis-server --daemonize yes`
- Database: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/gridiron`, `REDIS_URL=redis://localhost:6379`
- Checks: `npx tsc --noEmit -p . && npx eslint src --quiet && npx vitest run`
- Build and run: `npm run build`, then start the standalone server on port 3000.
- E2E: `E2E_BASE_URL=http://localhost:3000 PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`
  - Clear rate limits between runs: `redis-cli keys 'rate:*' | xargs -r redis-cli del`
- Balance check: run `calibrate()` from `src/lib/server/calibrate.ts`.
  - Target: a perfect (greedy) draft goes 17-0 about 10–12% of the time; random drafts about 0%.
  - The knobs are `WIN_FLOOR`/`WIN_SPAN` in `src/lib/game/seventeen.ts` (currently 67.25/26).
  - 12 and 16 man rosters have their own weights and floors (12: 67.75, 16: 68.1), calibrated locally to about 11.6 percent. Re-check on live ratings with the worker's `CALIBRATE=1` boot, which now runs all three formats.
  - Slot weights (2026-10, live; seed wrote v2 on 2026-10-02): QB 30, WR 22, RB 18, DEF 13, HC 9, TE 8. Win floor 67.25. Local calibration: greedy 12.2% 17-0, random 0%. After the web deploy, the seed writes them as `17-0/slot_weights` v2 unless an admin edited that key (then set them in `/admin/formulas`). Re-check calibration on live ratings by booting the worker once with `CALIBRATE=1`.
- Coach ratings are ranked onto 80–97 in `src/lib/server/coaches.ts`. They must never read as a liability.
  - Fixed and deployed: the web boot seed used to overwrite every coach's score with the raw 30s-70s value, so each web deploy dropped live coach ratings until the next worker boot or Monday recompute. The seed now leaves existing scores alone.
  - Still open: the seed also resets each coach's `teamId` to the seed file on every web boot, which could undo an ESPN head-coach change. Worth checking against the ESPN sync.

## To do
- [x] **Domain:** playunbeaten.com is live (bought 2026-10-02 at Porkbun, Railway custom domain verified, certificate valid). `SITE_URL` and `NEXTAUTH_URL` on web and `SITE_URL` on worker are `https://playunbeaten.com`. The `*.up.railway.app` service domains were removed, so the site is only on playunbeaten.com.
- [ ] **www:** add in Porkbun: CNAME `www` -> `v1phzxbs.up.railway.app` and TXT `_railway-verify.www` -> the value shown in Railway (web > Networking). Then add a `www` -> apex redirect (a host-matched redirect in `next.config.ts`).
- [ ] **Google sign-in:** add `https://playunbeaten.com/api/auth/callback/google` as an authorized redirect URI (and `https://playunbeaten.com` as a JavaScript origin) on the Google OAuth client, if `GOOGLE_CLIENT_ID` is set.
- [ ] **Email is off:** `RESEND_API_KEY` is not set on web or worker, so no email is sent (verification, newsletter, alerts). Set up Resend on playunbeaten.com (SPF, DKIM, DMARC in Porkbun), then set `RESEND_API_KEY` and `EMAIL_FROM`.
- [ ] **AdSense** (deployed): `public/ads.txt` has the publisher line, the AdSense script loads with `ca-pub-3526440256333845` (`src/lib/ads.ts`), and ads are limited to one fixed 160x600 unit in a sticky right rail on result pages, only on screens 1100px and wider. No ads on phones, in games, or inline with content. Remaining:
  1. Owner: in AdSense, turn **Auto ads off** for the site (Auto ads inject large anchor and full-screen ads everywhere), and create one **160x600 fixed-size display unit**.
  2. Set `NEXT_PUBLIC_ADSENSE_SIDE_SLOT` on web to that unit's numeric ID and redeploy web (it is a build arg). Until then the rail renders nothing.
  3. `ads.txt` must be reachable at `https://playunbeaten.com/ads.txt` once the domain is connected.
- [ ] Contact emails (the owner creates them after buying the domain), then wire them into the contact and legal pages.
- [x] Confirm the live coach ratings after the worker deploy. Confirmed 2026-10-02 from the worker log: 80-97 (n=32).
  - Deployed: `recomputeCoachImpact` now logs `[coaches] recomputed N: current head coaches MIN-MAX (n=32)`, and the worker logs recompute failures instead of swallowing them. Locally it reads 80-97 (n=32). Read that line in the worker's Railway deploy logs to confirm the live range.
- [x] ESPN namesakes (2026-10-02): roster matching keyed on name alone, so the Panthers' rookie DB DeVonta Smith moved the Eagles WR DeVonta Smith to CAR (and gave him the wrong photo). Matching now also requires the same position family (`src/lib/server/espn-match.ts`), prefers a known ESPN id, and skips true ties; the worker log reports `skipped N name clashes`. The headshot search fallback still matches by name only.
  - Same day: the sync also matches spelling differences by team and last name (Cam/Cameron), accepts a lone cross-position namesake on the player's own team (Travis Hunter CB/WR), and turns current players who are on no ESPN roster (IR is included in ESPN rosters) into free agents, so cut, retired and unsigned players (Tyreek Hill, Russell Wilson, Joe Mixon, DeAndre Hopkins) stop appearing for their old team. It releases nobody if more than 100 would go. Placeholder rows from the seed file (never confirmed by the EA feed, `madden_version` `seed-*`) that are on no roster are retired (`is_active` false): most were a second spelling of a real player with generated ratings (Cam / Cameron Heyward, Chigoziem / Chig Okonkwo).
  - The web boot seed used to rewrite those rows on every deploy (team, active flag, ESPN id, photo), which put cut and traded players back on their seed teams. It now only refreshes legends, and coaches keep the team ESPN gives them. When a real EA row and a placeholder are the same person (Cam / Cameron Heyward), EA rows claim ESPN athletes first and the placeholder is retired as a duplicate; released EA rows can be re-found league-wide by last name, position and first initial. Every run logs the full lists in the worker deploy logs.
  - Correction (2026-10-02): ESPN leaves some injured-reserve players off its rosters (Jalon Walker, ACL, 2026), so absence from ESPN no longer releases a real EA player; only a listing on another team moves him. Spelling matches need compatible first names (`firstNamesCompatible`: prefix, three shared letters, initials, a short alias list), after a loose match sent Jalon Walker to DEN as Johnny Walker. Links to an incompatible name are removed with their photo. Real EA players wrongly released earlier get their EA team back at the next daily EA sync (10:00 UTC).
- [ ] Missing headshots: about 28 players still show initials after the ESPN search fallback. Try another source or name matching.
- [x] Hard mode for Build a Player (type a name, then pick a trait; overalls and trait ratings never leave the server until the result) and a "Hard mode only" filter on the daily leaderboard for 17-0 and Build a Player. Hard runs carry a Hard tag; the daily table no longer shows the raw score.
- [ ] More games. Shipped 2026-10-02: **Size Up** (who is taller), **Vet Check** (who has more seasons), **Division Line** (three share a division, find the odd one). Earlier: **Numbers Game** (`/games/numbers-game`): a team and a jersey number, three of that team's players, pick who wears it; 8 rounds from 8 teams. Jersey numbers now come from ESPN rosters, so they stay current after trades. Still open: a draft-class quiz, a trade-machine "who won" game, a weekly bracket.
- [x] Polish the mobile results page (check the slot grades table at 375px).
  - Deployed: the 17-0 slot grades and Build a Player trait tables are now three columns (team stacked under the pick, number under the letter grade), so neither scrolls sideways at 375px.
- [x] Streaks and stats on the profile page: current and longest streak, games played, best 17-0 record, perfect seasons. The mixed-game "average score" and raw score columns are gone, and recent runs say Today or Casual.
- [ ] Push reminders or the daily email for Today puzzles (the newsletter worker already exists).
- [x] Share preview (2026-10-02): `public/og-default.png` still said "Gridiron Lab" on the old dark design. Regenerated in the current light design with the goalpost mark and playunbeaten.com (`npx tsx scripts/og-default.ts`), and the site description now mentions every game.
- [ ] Email templates (`src/lib/server/email.ts`) still use the old dark palette. Restyle them when email is switched on.
- [x] GitHub CI (2026-10-02): every push was failing because Playwright's web server started the standalone build without `.next/static` and `public` beside it, so pages loaded unstyled and never hydrated (83 failures). `playwright.config.ts` now copies them first, like the Dockerfile. The Railway cron itself was fine.
- [x] Sharing (2026-10-02): one Share button opens a sheet (share link, copy link, text message, X, Facebook, save image, copy text). Messages carry the link only; the link unfurls into the score card.
- [x] Profiles (2026-10-02): top-right profile button (`HeaderProfile`, loads `/api/user/me` after the page), profile editor (display name, picture resized to 160px in the browser and stored as a small data URL, up to three favorite games, name style), public profile at `/u/[username]` (noindex), styled names linked on leaderboards.
- [x] Streak rewards: fonts and colors in `src/lib/cosmetics.ts`, unlocked by longest daily streak and checked on the server when equipped. The owner style (Monoton "neon" font, moving rainbow, red [OWNER] tag) is granted only to `OWNER_EMAILS` (default clujkeebs@aol.com) from the account email on the server; it is in neither unlock list, so nobody can equip it. Usernames containing "owner" are reserved and display names cannot use reserved words or square brackets.
- [ ] Watch Railway logs for errors after each deploy.
- Fixed 2026-10-02: an intermittent e2e failure on `/games/name-that-team` was a real contrast failure. Mini-game entry animations faded text in from transparent; axe caught them mid-fade. Entry animations now move without fading, and unused clues no longer use 60% opacity.
