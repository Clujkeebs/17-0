# Unbeaten: handoff and to-do list

Live site: https://web-production-3f1b7.up.railway.app
Repo: github.com/clujkeebs/17-0, branch `main`. The working branch `gridiron-lab-build` is kept equal to `main`.

## What it is
NFL ratings game site built on Next.js 16 (App Router, standalone output), React 19, TypeScript, Drizzle with Postgres, Redis, BullMQ, NextAuth v5, Vitest and Playwright.

- **17-0:** spin a team, draft QB, RB, WR, TE, DEF and HC one team at a time, then simulate a season. Has re-rolls, Hard mode (type to draft, overalls hidden), and a reel that spins even with Reduce Motion on.
- **Build a Player:** five spins, one trait each.
- **12 daily mini games:** Higher or Lower, Grid, Mystery Player, Where's He From, Blind Resume, Rating Match, Guess the Overall, Top Ten, Rank 'Em, Name That Team, Speed Trap, Odd One Out.
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
- Start the services: `service postgresql start; redis-server --daemonize yes`
- Database: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/gridiron`, `REDIS_URL=redis://localhost:6379`
- Checks: `npx tsc --noEmit -p . && npx eslint src --quiet && npx vitest run`
- Build and run: `npm run build`, then start the standalone server on port 3000.
- E2E: `E2E_BASE_URL=http://localhost:3000 PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`
  - Clear rate limits between runs: `redis-cli keys 'rate:*' | xargs -r redis-cli del`
- Balance check: run `calibrate()` from `src/lib/server/calibrate.ts`.
  - Target: a perfect (greedy) draft goes 17-0 about 10–12% of the time; random drafts about 0%.
  - The knobs are `WIN_FLOOR`/`WIN_SPAN` in `src/lib/game/seventeen.ts` (currently 67/26).
- Coach ratings are ranked onto 80–97 in `src/lib/server/coaches.ts`. They must never read as a liability.

## To do
- [ ] **Domain:** buy and connect **playunbeaten.com** (available as of 2026-09-30; other options: unbeaten.games, unbeatenfootball.com, unbeaten.football). The owner must approve the purchase. Then add it as a Railway custom domain, update `NEXT_PUBLIC_SITE_URL`/`AUTH_URL`, and set up the contact emails on it.
- [ ] Contact emails (the owner creates them after buying the domain), then wire them into the contact and legal pages.
- [ ] Confirm the live coach ratings after the worker deploy. They should be 80–97; check `/coaches`. Add a log line to `recomputeCoachImpact`.
- [ ] Missing headshots: about 28 players still show initials after the ESPN search fallback. Try another source or name matching.
- [ ] Hard mode for Build a Player and a Hard leaderboard filter for 17-0.
- [ ] More games: ideas include a guess-the-jersey-number streak, a draft-class quiz, a trade-machine "who won" game, and a weekly bracket.
- [ ] Polish the mobile results page (check the slot grades table at 375px).
- [ ] Streaks and stats on the profile page (daily streak, best 17-0 record, games played).
- [ ] Push reminders or the daily email for Today puzzles (the newsletter worker already exists).
- [ ] Watch Railway logs for errors after each deploy.
