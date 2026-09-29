# Contributing to Gridiron Lab

Thanks for helping. This is a small codebase with strict taste. Read `DESIGN.md` before touching UI or copy.

## Setup

Requirements: Node 22+, Postgres 16+, Redis 7+. A Chromium binary for Playwright (sync worker, OG images, e2e tests).

```bash
cp .env.example .env.local        # fill in secrets; defaults work for local Postgres and Redis
npm install
npm run db:migrate                 # apply Drizzle migrations
npm run db:seed                    # load teams, players, coaches
npm run dev                        # http://localhost:3000
npm run worker                     # BullMQ worker (ratings sync, emails, share cards) in a second terminal
```

Local defaults: `postgres://postgres:postgres@localhost:5432/gridiron` and `redis://localhost:6379`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:coverage` | Vitest with v8 coverage |
| `npm run test:e2e` | Playwright end-to-end tests, including axe accessibility checks |
| `npm run db:generate` | Generate a Drizzle migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed reference data |
| `npm run worker` | Start the BullMQ worker |
| `npm run cron` | Run scheduled jobs once (Railway cron calls this) |
| `npx tsx scripts/og-default.ts` | Regenerate `public/og-default.png` |

## Code style

- TypeScript strict. No `any` without a comment explaining why.
- Next.js App Router. **Server components by default.** Add `'use client'` only where interaction requires it. Content and legal pages ship zero client JS.
- Every route handler declares `export const runtime = 'nodejs';`. Never Edge.
- Every page exports `metadata` or `generateMetadata` with a title, description, and `alternates.canonical`.
- Import through the `@/` alias (`@/` is `src/`).
- Database access through Drizzle (`import { db, schema } from '@/db'`). Schema changes go through `npm run db:generate`, never hand-edited SQL in production.
- Reuse helpers in `src/lib/server/*` (`json`, `errorJson`, `rateLimit`, `cached`, `hashIp`). Every public mutation is rate limited.
- Game logic in `src/lib/game/*` must stay pure and deterministic: all randomness comes from the seeded PRNG, never `Math.random()`.
- Styling uses classes from `src/app/globals.css` and palette tokens only. No CSS frameworks. Inline styles are fine for one-off layout.
- Icons only from `src/components/Icons.tsx`.
- Never log PII. Never store raw IP addresses: hash them with `hashIp`.

## Copy rules

These are enforced in review. See `DESIGN.md` section 6 for voice and examples.

- No em-dashes (U+2014). Avoid en-dashes in prose. Check with `LC_ALL=C.UTF-8 grep -rnP '\x{2014}' src marketing *.md`.
- No emoji.
- Banned words: unlock, elevate, seamless, game-changing, next level, dream roster, powerful, intuitive.
- Never use "Madden" as branding. "EA Sports Madden NFL ratings" is fine as a descriptive source citation.
- No fake testimonials, user counts, or "trusted by".
- Nothing that implies gambling: no odds, lines, prizes for results, or sportsbook links.

## Testing expectations

- **Game engine and formulas:** unit tests are required for any change. Include a determinism test (same seed and picks produce the same result) and boundary cases (min and max ratings).
- **Route handlers:** test validation, auth, and rate-limit paths.
- **UI flows:** add or update a Playwright spec when you change a user flow (spin, pick, submit, share, sign in).
- **Accessibility:** e2e specs run axe. New pages must pass with zero serious or critical violations.
- Put unit tests in `tests/unit`, e2e in `tests/e2e`.

## Pull request checklist

- [ ] `npm run typecheck`, `npm run lint`, and `npm test` pass
- [ ] E2E updated if a user flow changed
- [ ] New pages export metadata with a canonical URL
- [ ] No new client component where a server component would do
- [ ] Route handlers use `runtime = 'nodejs'` and rate limiting where public
- [ ] No em-dashes, emoji, or banned words in copy
- [ ] Palette tokens only; no new colors, gradients, or shadows
- [ ] Keyboard and screen reader checked; focus ring visible; reduced motion respected
- [ ] No PII in logs, analytics events, or error reports
- [ ] Migrations generated and committed if the schema changed
- [ ] Screenshots attached for visual changes (mobile at 375px and desktop)
