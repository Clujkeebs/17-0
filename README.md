# Unbeaten

**Six picks. Seventeen games. One perfect season.**

Live: https://playunbeaten.com

Unbeaten is an NFL ratings game site built on EA Sports Madden NFL ratings:

- **17-0**: one reel spins a single team at a time, and you draft one player from it into an open slot: QB, RB, WR, TE, DEF (any defender) or HC. Six spins fill the roster. The server grades the roster and projects a 17-game record. A daily puzzle resets at midnight ET and has its own leaderboard.
- **Build a Player**: pick a position (a position of the day is preselected) and spin five teams, one at a time, with no repeats. Each position has five weighted traits. On each spin you take one trait from one player. The result is a weighted score, a letter grade, the best possible score from those five teams, and a simulated season.

- **12 daily mini games**: Higher or Lower, Grid, Mystery Player, Where's He From, Blind Resume, Rating Match, Guess the Overall, Top Ten, Rank 'Em, Name That Team, Speed Trap and Odd One Out.

Every game has a Today mode (ranked, account required, one try) and a Casual mode (unlimited), and every result gets a share sheet and a score card.

The site also has about 8,000 programmatic SEO pages (players, teams, coaches, positions, comparisons, team and position game landers), accounts with streaks, a double opt-in newsletter, an admin panel and the full legal set.

## Read this first (people and AI agents)

If you are changing this repo, read this section, then `HANDOFF.md` (current state and to-do list) and `AGENTS.md`. Ask the owner before anything that costs money, buys a domain, or changes what is live in a way users would notice.

### The rules

1. **This is Next.js 16, not the one you remember.** APIs and conventions changed. Read the guide in `node_modules/next/dist/docs/` before using a Next API and heed deprecation notices.
2. **No em-dashes** anywhere in copy or docs. Avoid en-dashes in prose. No emoji (one exception: the profile streak flame). Check with `LC_ALL=C.UTF-8 grep -rnP '\x{2014}' src marketing *.md`.
3. **Dry voice.** Short, plain sentences, a little wry. No hype. Banned words: unlock, elevate, seamless, game-changing, next level, dream roster, powerful, intuitive.
4. **Clean, premium, light design.** Use the tokens in `src/app/globals.css` and the rules in `DESIGN.md`. One red accent per view, used for meaning. No new colors, gradients, glows or CSS frameworks.
5. **Icons are custom SVG** from `src/components/Icons.tsx`. No icon libraries.
6. **No placeholders.** No lorem ipsum, fake stats, fake testimonials, user counts or "coming soon" stubs. If something is not real yet, leave it out.
7. **Game modes are "Today" (ranked, account required, one try) and "Casual" (unlimited).** Never call Casual "practice".
8. **"Madden" is never branding.** "EA Sports Madden NFL ratings" is fine as a source citation.
9. **Nothing that implies gambling:** no odds, lines, prizes for results or sportsbook links.
10. **Do not disguise the site** (category, metadata) to get past school filters. Declined on purpose.
11. **Never log PII or raw IPs.** Hash IPs with `hashIp`. Public mutations are rate limited.
12. **Game logic stays pure.** Everything in `src/lib/game/` uses the seeded PRNG, never `Math.random()`.
13. **Ads stay small and to the side.** One fixed 160x600 unit in a side rail on wide screens only. No inline, banner, anchor or pop-up ads, nothing on phones, and nothing inside a game.
14. **Coach ratings never read as a liability.** Current head coaches are ranked onto 80 to 97 in `src/lib/server/coaches.ts`.

### How to make a change

1. Run the checks: `npx tsc --noEmit -p . && npx eslint src --quiet && npx vitest run`.
2. Build, start the standalone server, and run Playwright (desktop 1440 and phone 375): see Local setup below.
3. Look at the page at **375px wide**. Nothing should scroll sideways.
4. Commit with a message that says what changed for players, not just which files moved.
5. Deploy. **Pushing to GitHub does not deploy.** See "Deploying" below.
6. Tick the item off in `HANDOFF.md` and add anything the next person needs to know.

### Good to know

- **Where things live.** Pages are in `src/app/(site)` and `src/app/(game)`. The 17-0 engine is `src/lib/game/seventeen.ts`, Build a Player is `src/lib/game/build.ts`, and the mini games are registered in `src/lib/minigames/registry.ts`. Server helpers (DB, cache, rate limits, email, ESPN) are in `src/lib/server/`.
- **Adding a mini game.** Copy an existing one in `src/lib/minigames/games/`, register it, add a unit test in `tests/unit/` and make sure its result page and score card render. It gets Today and Casual modes, a leaderboard and the share sheet from the framework.
- **Balance.** A perfect (greedy) 17-0 draft should go 17-0 about 10 to 12 percent of the time, a random draft about never. The knobs are `WIN_FLOOR` and `WIN_SPAN` in `src/lib/game/seventeen.ts`. Check with `calibrate()` in `src/lib/server/calibrate.ts` before and after touching them.
- **Data sources.** Ratings come from EA's Madden 27 ratings pages. Current rosters, headshots and head coaches come from ESPN, synced by the worker on boot and on schedule. Players without a photo fall back to a monogram.
- **Server components by default.** Add `'use client'` only where something is interactive. Route handlers declare `export const runtime = 'nodejs'`. Every page exports metadata with a canonical URL.
- **Schema changes** go through `npm run db:generate`. Migrations are additive only, so a rollback never needs a down-migration.
- **Sandboxed agents** may not be able to reach the live site or ESPN's CDN. Logos and headshots then show blank locally; that is the network, not a bug. Check live behavior through Railway logs.
- **Restarting the local server:** make sure an older `next-server` is not still holding port 3000, or you will test a stale build.
- **Rate limits** will trip repeated e2e runs. Clear them: `redis-cli keys 'rate:*' | xargs -r redis-cli del`.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, `output: 'standalone'`), React 19, TypeScript |
| Data | Postgres via Drizzle ORM, Redis via ioredis |
| Jobs | BullMQ worker: `madden-sync`, `newsletter`, `og-image` |
| Auth | Auth.js (NextAuth v5): Google OAuth plus email and password (bcrypt, 12 rounds), JWT cookie sessions |
| Email | Resend (logs to the console when no API key is set) |
| Images | ESPN CDN headshots, cached to Cloudflare R2, with a deterministic SVG monogram fallback |
| Share cards | `next/og` at `/api/og/game-result` |
| Monitoring | Sentry (PII scrubbed), `/api/health`, email alerts to `ADMIN_EMAILS` |
| Hosting | Railway: `web`, `worker`, `cron`, `backup`, Postgres, Redis |

## Architecture

```
            Cloudflare (DNS, TLS, cache)
                      |
                +-----v-----+    enqueue    +---------+
                |    web    |-------------->|  Redis  |<----+
                |  Next.js  |<--- cache ----|  BullMQ |     |
                +-----+-----+               +----+----+     |
                      |                          |          |
          internal    |                    +-----v-----+    |
     http://web.railway.internal:3000      |  worker   |----+  heartbeat
                      ^                    | Playwright|
                +-----+-----+              +-----+-----+
                |   cron    | every 15 min       |
                +-----------+                    v
                +-----------+  nightly     +-----------+
                |  backup   |------------->| Postgres  |
                +-----+-----+  pg_dump     +-----------+
                      v
                Cloudflare R2
```

- **web** serves pages and APIs, runs migrations on boot, and renders share cards.
- **worker** runs the ratings sync (EA JSON endpoint with a Playwright fallback), sends email, and pre-warms share cards. Raw ratings snapshots go to `/app/snapshots` on a volume.
- **cron** runs `node cron.mjs` every 15 minutes and calls the `/api/internal/cron/*` endpoints that are due, using `CRON_SECRET`.
- **backup** runs `node backup.mjs` daily at 07:15 UTC and streams `pg_dump` to R2.

Game logic lives in `src/lib/game/` as pure functions with a deterministic PRNG (sfc32 seeded by cyrb128). Unit tests cover it above 80 percent.

## Local setup

Requirements: Node 22+, Postgres 16, and Redis 7. Start them with `service postgresql start; redis-server --daemonize yes`. Local URLs: `postgres://postgres:postgres@localhost:5432/gridiron` and `redis://localhost:6379`.

```bash
cp .env.example .env.local        # fill in what you have; everything optional works without keys
npm install
npm run db:migrate                # applies drizzle/ migrations
npm run db:seed                   # 32 teams, 49 coaches, 594 players
npm run dev                       # http://localhost:3000
npm run worker                    # in another terminal: BullMQ worker
```

Production-style run and end-to-end tests:

```bash
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
PORT=3000 node .next/standalone/server.js &
E2E_BASE_URL=http://localhost:3000 PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test
```

To make yourself an admin, add your email to `ADMIN_EMAILS`, register, and open `/admin`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run build:worker` | Bundles the worker, migrator, cron and backup scripts into `dist/` with esbuild |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm test` / `test:coverage` | Vitest unit tests (engine coverage threshold 80 percent) |
| `npm run test:e2e` | Playwright: both games, every public page with axe, links, health (desktop 1440 and mobile 375) |
| `npm run db:generate` | Generates a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` / `db:seed` | Migrates and seeds |
| `npm run worker` | Runs the worker with tsx (dev) |
| `npm run cron [job]` | Runs the cron dispatcher, or a single job by name |

## Environment variables

| Var | Service | Notes |
|---|---|---|
| `DATABASE_URL` | web, worker, backup | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | web, worker | `${{Redis.REDIS_URL}}` |
| `AUTH_SECRET` (or `NEXTAUTH_SECRET`) | web | `openssl rand -base64 32` |
| `NEXTAUTH_URL`, `SITE_URL` | web | Public origin: `https://playunbeaten.com` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | web | The Google button is hidden when these are unset |
| `RESEND_API_KEY`, `EMAIL_FROM` | web, worker | Email is logged to stdout when unset |
| `MAILING_ADDRESS` | web, worker | Physical address in every email (CAN-SPAM) |
| `NEXT_PUBLIC_ADSENSE_SIDE_SLOT` | web (build time) | Numeric ID of the 160x600 side-rail unit. The rail renders nothing when unset |
| `GOOGLE_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_CLIENT` | web | Optional overrides; the publisher ID defaults to the one in `src/lib/ads.ts` |
| `CRON_SECRET` | web, cron | Bearer token for `/api/internal/cron/*` |
| `SENTRY_DSN` | web, worker | Optional |
| `IP_HASH_SALT` | web | Salt for hashed IPs used by rate limits |
| `ADMIN_EMAILS` | web, worker | Comma-separated admin whitelist. Admin access, plus email alerts for sync failures, queue health, and contact form messages |
| `INTERNAL_WEB_URL` | cron, worker | `http://web.railway.internal:3000` |
| `MADDEN_RATINGS_URL` | worker | Ratings source (default is EA's public ratings endpoint) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `R2_BACKUP_BUCKET` | web, worker, backup | Image cache and backups |

## Deploying to Railway

Project "unbeaten" (`d6a0d144-b4a1-46ee-90ba-5adc85fa4e55`), environment `778c8a82-2002-455d-b720-d7386f22e6fa`.

| Service | ID | Built from |
|---|---|---|
| web | `d2e53b77-afed-4af9-9d20-6a26d3c39e3d` | `Dockerfile` |
| worker | `702261d7-b927-42b5-a7bd-7a3dcc2be29d` | `Dockerfile.worker` |
| cron | `c0924f5d-bc9b-499c-b06c-229579b63b8e` | `Dockerfile.cron` |

Postgres and Redis are Railway plugins.

**Pushing to GitHub does not deploy.** After pushing to `main`, connect the source for each service you changed (Railway MCP `connect-service-source`, repo `clujkeebs/17-0`, branch `main`, or the Railway dashboard), then confirm with `list-deployments` that the new deploy reached SUCCESS and read its logs for errors.

- Changed pages, components, API routes or CSS: deploy **web**.
- Changed `worker/`, `src/lib/server/espn.ts`, `src/lib/server/coaches.ts` or the sync: deploy **worker** (it runs the ESPN sync and coach recompute on boot).
- Changed `scripts/cron.mjs` or the cron schedule: deploy **cron**.
- Shared code in `src/lib/server/` can need both web and worker.

The web service runs migrations and an idempotent seed on boot (`scripts/start.sh`).

## Rollback

In Railway, open the service, then *Deployments*, pick the last good deploy and choose **Redeploy**. Migrations are additive-only by convention (see CONTRIBUTING.md), so rolling back code never needs a down-migration. For data, use Postgres point-in-time recovery or restore the latest R2 dump:

```bash
pg_restore --clean --no-owner -d "$DATABASE_URL" 2026-09-29.dump
```

## Docs

- `DESIGN.md`: the design system
- `DECISIONS.md`: why things are the way they are
- `HANDOFF.md`: current state, deploy steps and the live to-do list (start here)
- `TODO.md`: the original launch checklist, with owners and priority
- `CONTRIBUTING.md`: how to work in this repo
- `marketing/`: launch copy, calendar, share templates, KPIs, launch checklist
