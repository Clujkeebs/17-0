# Shared brief for parallel build agents (delete before launch)

Project: **Gridiron Lab**, Next.js 16 App Router (TypeScript, React 19), Drizzle ORM + Postgres, Redis (ioredis), NextAuth v5 (JWT sessions), deployed on Railway. Repo: /home/user/17-0.

## Ground rules (hard)
- Do NOT run any git commands. Do NOT run `npm install` (ask the lead in your final report if a package is missing). Do NOT run `next build` or `next dev` (the lead runs them). You may run `npx tsc --noEmit -p .` and `npx vitest run <file>`.
- Only create/edit files in the directories you own (listed in your task). Read anything.
- Local Postgres: `postgres://postgres:postgres@localhost:5432/gridiron` (migrated). Redis at localhost:6379.
- All route handlers: `export const runtime = 'nodejs';`. Never Edge.
- Path alias `@/` = `src/`.
- Pages under `src/app/(site)/` automatically get the site header + stale-sync banner via `src/app/(site)/layout.tsx`. Root layout adds footer, cookie banner, skip link. Wrap page content in `<div className="container section">` etc. `<main id="main">` is already provided by the (site) layout.
- Styling: use classes from `src/app/globals.css` (container, section, card, card-green, btn, btn-primary, eyebrow, big-num, num, muted, accent, divider, prose, stat, table-wrap, field, hint, field-error, banner). Inline styles OK for one-off layout. No CSS frameworks. Palette tokens only: --navy --green --bone --orange --steel --danger (+ --bone-dim, --surface). No gradients, glows, glassmorphism, heavy shadows.
- Fonts: Inter (UI), JetBrains Mono (numbers, class `num`). No others.
- Icons: only custom SVGs from `src/components/Icons.tsx` (add new ones there if you must, same style). No lucide/heroicons.
- Existing helpers: `src/lib/server/data.ts` (queries), `src/lib/server/redis.ts` (`cached`, `getRedis`), `src/lib/server/request.ts` (`json`, `errorJson`, `clientIp`, `hashIp`, `token`, `requireCron`), `src/lib/server/rate-limit.ts` (`rateLimit`, `limitByIp`), `src/lib/server/audit.ts`, `src/lib/site.ts` (`SITE`, `slugify`), `src/auth.ts` (`auth`, `requireAdmin`, `isAdminEmail`), `src/lib/game/*` (engine, attributes, formulas), `src/components/*` (Avatar w/ monogram fallback, JsonLd, NewsletterForm, AdSlot, Icons). Schema: `src/db/schema.ts`, db: `import { db, schema } from '@/db'`.
- Server components by default. Client components only where interaction requires. Public content pages should ship zero client JS where possible.
- Every page: `export const metadata` or `generateMetadata` with title, description, `alternates.canonical`.

## Copy rules (hard)
- NO em-dashes (the character U+2014) anywhere in user-facing copy. Also avoid en-dashes in prose; use commas, periods, colons, or "to".
- No emoji (except the streak flame, which is the lead's).
- Voice: dry, confident, statistically literate. Like someone who watches All-22 and argues EPA/play. Never corporate, never chirpy. Banned: "unlock", "elevate", "seamless", "game-changing", "next level", "dream roster", "powerful", "intuitive".
- No fake testimonials, no user counts, no "trusted by".
- Never use "Madden" in branding. Refer to "EA Sports Madden NFL ratings" descriptively only.

## Final report
Keep it short: files created, anything left unfinished, any packages you need, any assumptions the lead should record in DECISIONS.md.
