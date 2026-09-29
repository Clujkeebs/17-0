# KPIs and analytics events

Analytics are first-party only: events go to `/api/events` via `sendBeacon` (`src/lib/analytics.ts`). No PII in events, no third-party analytics. Rates are computed daily from event counts; "users" means distinct anonymous session IDs unless noted.

## KPI table

| KPI | Definition | Source events | Target (first 90 days) | Review cadence |
|---|---|---|---|---|
| Daily plays | Count of `game_started` per day | `game_started` | Growing week over week | Daily |
| Completion rate | `game_completed` / `game_started` | `game_started`, `game_completed` | 70% or higher | Daily |
| Share rate | `game_shared` / `game_completed` | `game_shared`, `game_completed` | 10% or higher | Daily |
| Daily puzzle share of plays | Daily completions / all completions | `game_completed` (`daily: true`) | 60% or higher | Weekly |
| Day 1 return | Share of first-time players who play again the next day | `game_started` | 25% or higher | Weekly |
| Day 7 return | Same, 7 days later | `game_started` | 12% or higher | Weekly |
| Signup conversion | `signup_completed` / `signup_started` | `signup_started`, `signup_completed` | 60% or higher | Weekly |
| Newsletter form conversion | `newsletter_submitted` / `newsletter_viewed` | `newsletter_viewed`, `newsletter_submitted` | 3% or higher | Weekly |
| Newsletter confirm rate | `newsletter_confirmed` / `newsletter_submitted` | `newsletter_submitted`, `newsletter_confirmed` | 70% or higher | Weekly |
| Newsletter open rate | Opens / delivered (Resend) | Resend webhooks | 45% or higher | Per send |
| Unsubscribe rate | Unsubscribes / delivered | Resend webhooks | Under 0.5% per send | Per send |
| Leaderboard engagement | `leaderboard_viewed` / `game_completed` | `leaderboard_viewed` | 30% or higher | Weekly |
| Ad RPM | Ad revenue / 1,000 page views | AdSense, `ad_impression` | Tracked, no target at launch | Weekly |
| Ad CTR | `ad_click` / `ad_impression` | `ad_impression`, `ad_click` | Tracked for anomaly detection only | Weekly |
| Core Web Vitals | LCP, INP, CLS at p75 | Field data (CrUX) | LCP under 2.5s, INP under 200ms, CLS under 0.1 | Weekly |
| Error rate | Sentry events / sessions | Sentry | Under 0.5% | Daily |
| Sync freshness | Hours since last successful ratings sync | `sync_snapshots` | Under 26h | Daily (alerting) |
| Flagged results | Share of results with `flagged = true` | `game_results` | Under 1% | Weekly |

## Analytics event list

| Event | Fired when | Allowed props |
|---|---|---|
| `game_started` | A game session is created (spin requested) | `game` (`17-0` or `build-a-player`), `daily` (bool) |
| `game_completed` | A result is accepted by the server | `game`, `daily`, `wins` (17-0 only), `overall` (Build only) |
| `game_shared` | User taps share or copy | `game`, `channel` (`native`, `x`, `copy`, `image`) |
| `signup_started` | Signup form first interacted with, or OAuth button clicked | `method` (`email`, `google`) |
| `signup_completed` | Account created | `method` |
| `newsletter_viewed` | Newsletter form scrolls into view (once per page view) | `source` (`footer`, `result`, `blog`) |
| `newsletter_submitted` | Newsletter form submitted successfully | `source` |
| `newsletter_confirmed` | Double opt-in link clicked (server side) | `source` |
| `leaderboard_viewed` | Leaderboard page or panel viewed | `scope` (`daily`, `all-time`) |
| `ad_impression` | Ad slot rendered with a filled ad | `slot` |
| `ad_click` | Click detected on an ad slot | `slot` |

Rules: no emails, usernames, IPs, free text, or full URLs with query strings in props. `path` is sent as pathname only.
