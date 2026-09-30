# Unbeaten

**Six picks. Seventeen games. One perfect season.**

Unbeaten has two NFL roster games built on EA Sports Madden NFL ratings:

- **17-0**: spin six teams and draft a QB, RB, WR/TE, defender, kicker and head coach, one from each team. The server grades the roster and projects a 17-game record. A daily puzzle resets at midnight ET and has its own leaderboard.
- **Build a Player**: pick a position and spin five teams. Take one player from each team, then assemble a custom player one attribute at a time. The build gets graded and simulated over a 17-game season.

The site also has about 8,000 programmatic SEO pages (players, teams, coaches, positions, comparisons, team and position game landers), accounts with streaks, a double opt-in newsletter, an admin panel and the full legal set.

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

Requirements: Node 22+, Postgres 16, and Redis 7.

```bash
cp .env.example .env.local        # fill in what you have; everything optional works without keys
npm install
npm run db:migrate                # applies drizzle/ migrations
npm run db:seed                   # 32 teams, coaches, ~450 players (placeholder ratings until first sync)
npm run dev                       # http://localhost:3000
npm run worker                    # in another terminal: BullMQ worker
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
| `NEXTAUTH_URL`, `SITE_URL` | web | Public origin, for example `https://unbeaten.com` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | web | The Google button is hidden when these are unset |
| `RESEND_API_KEY`, `EMAIL_FROM` | web, worker | Email is logged to stdout when unset |
| `MAILING_ADDRESS` | web, worker | Physical address in every email (CAN-SPAM) |
| `GOOGLE_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_CLIENT` | web (the second at build time) | Ads render nothing when unset |
| `CRON_SECRET` | web, cron | Bearer token for `/api/internal/cron/*` |
| `SENTRY_DSN` | web, worker | Optional |
| `IP_HASH_SALT` | web | Salt for hashed IPs used by rate limits |
| `ADMIN_EMAILS` | web, worker | Comma-separated admin whitelist. Admin access, plus email alerts for sync failures, queue health, and contact form messages |
| `INTERNAL_WEB_URL` | cron, worker | `http://web.railway.internal:3000` |
| `MADDEN_RATINGS_URL` | worker | Ratings source (default is EA's public ratings endpoint) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `R2_BACKUP_BUCKET` | web, worker, backup | Image cache and backups |

## Deploying to Railway

1. Create a project and add the **Postgres** and **Redis** plugins. Enable point-in-time recovery on Postgres (paid plan).
2. Create four services from this repo, each pointed at its config file under *Settings > Config-as-code*:
   - `web`: `railway/web.json`. Give it a public domain and attach a volume at `/app/.next/cache` (500 MB).
   - `worker`: `railway/worker.json`. No public domain. Attach a volume at `/app/snapshots` (2 GB).
   - `cron`: `railway/cron.json` (schedule `*/15 * * * *`).
   - `backup`: `railway/backup.json` (schedule `15 7 * * *`).
3. Set the variables above on each service, using Railway references such as `${{Postgres.DATABASE_URL}}`.
4. Deploy. The web service runs migrations on boot. Seed once with `railway run npm run db:seed`, then trigger a real sync from `/admin`.
5. Add the custom domain to `web`, put Cloudflare in front (proxied, Full (strict) SSL), and point UptimeRobot at `/api/health`.

Merging to `main` deploys through Railway's GitHub integration. GitHub Actions runs typecheck, lint, unit tests, build and Playwright on every PR (`.github/workflows/ci.yml`).

## Rollback

In Railway, open the service, then *Deployments*, pick the last good deploy and choose **Redeploy**. Migrations are additive-only by convention (see CONTRIBUTING.md), so rolling back code never needs a down-migration. For data, use Postgres point-in-time recovery or restore the latest R2 dump:

```bash
pg_restore --clean --no-owner -d "$DATABASE_URL" 2026-09-29.dump
```

## Docs

- `DESIGN.md`: the design system
- `DECISIONS.md`: why things are the way they are
- `TODO.md`: what is left, with owners and priority
- `CONTRIBUTING.md`: how to work in this repo
- `marketing/`: launch copy, calendar, share templates, KPIs, launch checklist
