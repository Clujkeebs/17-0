# Launch readiness checklist

Owner key: **Lead** (engineering lead), **Eng** (any engineer), **Content** (copy and marketing), **Legal** (legal review, can be Lead with counsel sign-off), **Ops** (Railway, DNS, monitoring).

## Product

| Done | Item | Owner |
|---|---|---|
| [ ] | 17-0 daily puzzle generates at midnight ET and is identical for all users | Lead |
| [ ] | Build a Player playable end to end on mobile and desktop | Eng |
| [ ] | Server replays every submitted result; forged submissions rejected | Lead |
| [ ] | Leaderboard shows daily and all-time; flagged results excluded | Eng |
| [ ] | Share cards render at 1200x630 and unfurl on X, iMessage, Discord | Eng |
| [ ] | Guest play works without an account | Eng |
| [ ] | Account deletion anonymizes results immediately and deletes the account within 30 days | Eng |
| [ ] | `/settings/export` returns complete JSON | Eng |

## Data

| Done | Item | Owner |
|---|---|---|
| [ ] | Full ratings sync completed; player count matches source | Lead |
| [ ] | Stale sync banner appears when last sync is older than threshold | Eng |
| [ ] | Sync snapshots older than 30 days are purged by cron | Ops |
| [ ] | Player images mirrored to R2 with monogram fallback | Eng |
| [ ] | Coaches and team data seeded and spot-checked | Content |

## Quality

| Done | Item | Owner |
|---|---|---|
| [ ] | `npm run typecheck`, `lint`, `test`, `test:e2e` all pass on main | Eng |
| [ ] | Axe: zero serious or critical violations on all page templates | Eng |
| [ ] | Keyboard-only run through both games | Eng |
| [ ] | Screen reader pass (VoiceOver iOS, NVDA Windows) | Eng |
| [ ] | Reduced motion verified | Eng |
| [ ] | Lighthouse mobile: performance 90+, accessibility 100 on home, game, player page | Eng |
| [ ] | No horizontal scroll at 320px on any page | Eng |
| [ ] | Grep for em-dashes and banned words across `src` and `marketing` returns nothing | Content |

## Security and privacy

| Done | Item | Owner |
|---|---|---|
| [ ] | All secrets set in Railway; `.env.example` has no real values | Ops |
| [ ] | `AUTH_SECRET`, `IP_HASH_SALT`, `CRON_SECRET` are unique random values | Ops |
| [ ] | Rate limits active on signup, sign-in, score submit, newsletter | Eng |
| [ ] | Cookies httpOnly, Secure, SameSite=Lax in production | Eng |
| [ ] | Sentry PII scrubbing verified with a test error | Eng |
| [ ] | Logs contain no emails or raw IPs | Eng |
| [ ] | Security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy) set | Eng |
| [ ] | Admin routes restricted to `ADMIN_EMAILS` | Lead |

## Legal

| Done | Item | Owner |
|---|---|---|
| [ ] | Terms, Privacy, Cookies, Disclaimer, DMCA, Accessibility reviewed by counsel | Legal |
| [ ] | DMCA agent registered with the U.S. Copyright Office; number added to `/legal/dmca` | Legal |
| [ ] | Real mailing address set in `MAILING_ADDRESS` | Legal |
| [ ] | Contact and legal email inboxes live and monitored | Ops |
| [ ] | No EA or NFL logos, UI, or branding anywhere; "Madden" used descriptively only | Legal |
| [ ] | Footer non-affiliation and image notices present on every page | Content |
| [ ] | Newsletter double opt-in and one-click unsubscribe tested (CAN-SPAM, CASL) | Eng |

## Ads

| Done | Item | Owner |
|---|---|---|
| [ ] | AdSense account approved; `ads.txt` served at root | Ops |
| [ ] | Ad slots reserve space (no layout shift) and are disabled by default in `ad_placements` | Eng |
| [ ] | Gambling ad categories blocked in AdSense | Ops |
| [ ] | Google consent message enabled for EEA, UK, Switzerland | Ops |

## SEO and sharing

| Done | Item | Owner |
|---|---|---|
| [ ] | `sitemap.xml` and `robots.txt` generated | Eng |
| [ ] | Every page has title, description, canonical | Eng |
| [ ] | `og-default.png` and `icon.svg` in place | Content |
| [ ] | JSON-LD validated on player, team, and blog pages | Eng |
| [ ] | Search Console property verified and sitemap submitted | Ops |

## Infrastructure

| Done | Item | Owner |
|---|---|---|
| [ ] | Web, worker, and cron services healthy on Railway | Ops |
| [ ] | Postgres backups enabled and a restore tested | Ops |
| [ ] | Uptime monitor on `/` and `/api/health` with alerts to admin email | Ops |
| [ ] | Custom domain with TLS; `www` redirects to apex (or the reverse) | Ops |
| [ ] | Load test: 50 concurrent game submissions without errors | Eng |
| [ ] | Rollback procedure documented and rehearsed | Lead |

## Launch day

| Done | Item | Owner |
|---|---|---|
| [ ] | Launch copy final (`marketing/launch-copy.md`) | Content |
| [ ] | Product Hunt listing scheduled for 12:01am PT | Content |
| [ ] | Show HN posted between 8 and 10am ET on a weekday | Lead |
| [ ] | Reddit posts spaced across the day, sub rules checked | Content |
| [ ] | X thread posted and pinned | Content |
| [ ] | Someone on call for bugs and replies for the first 12 hours | Lead |
| [ ] | Week 1 blog posts published or scheduled | Content |
| [ ] | Delete `AGENT_BRIEF.md` | Lead |
