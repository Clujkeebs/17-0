# TODO

What is left before and after launch. Priority: P0 blocks launch, P1 is launch week, P2 is later.

| # | Item | Owner | Priority |
|---|---|---|---|
| 1 | **Run the first live ratings sync on Railway.** The build sandbox could not reach EA (proxy 403), so `fetchRatings()` has only been tested against fixtures. In prod: trigger from `/admin`, check `sync_snapshots`, and adjust `parse.ts` field mapping if EA's payload differs. The DB currently holds the placeholder seed (594 players, `seed-2027`). | Eng | P0 |
| 2 | **Verify seed rosters and coaches** if launching before the sync works. Coach rows marked `// verify` in `data/seed/coaches.ts` (January 2026 hires) are the least certain. | Content | P0 |
| 3 | **Build the Docker images on Railway once.** `docker build` could not be verified here (Docker Hub rate limit plus no registry proxy). Confirm the `web` image is under 400 MB and `worker` launches Chromium. Next.js build, standalone server, worker bundle and cron bundle were all verified locally. | Eng | P0 |
| 4 | Set all env vars (README table), `AUTH_SECRET`, `CRON_SECRET`, `IP_HASH_SALT`, Google OAuth credentials, Resend domain (SPF/DKIM/DMARC), `MAILING_ADDRESS`. | Ops | P0 |
| 5 | Replace placeholder contact info: `SITE.contactEmail`, `SITE.legalEmail`, mailing address, and the DMCA agent registration number (file with the U.S. Copyright Office, $6). | Legal | P0 |
| 6 | Have counsel review `/legal/*` (arbitration clause, giveaway rules in `marketing/launch-copy.md`). | Legal | P0 |
| 7 | Final brand name and domain. Keep "Madden" out of both. | Founder | P0 |
| 8 | AdSense approval, then set `GOOGLE_ADSENSE_CLIENT` and `NEXT_PUBLIC_ADSENSE_CLIENT` (build arg) and enable rows in `ad_placements`. | Founder | P1 |
| 9 | Headshot coverage: only ~45 seed players have ESPN IDs; the rest use monograms. After the live sync, backfill `espn_id` and run the R2 cache (`cacheImageToR2`). | Eng | P1 |
| 10 | Enable Railway Postgres PITR; run one restore of an R2 dump into a scratch DB to prove backups. | Ops | P1 |
| 11 | UptimeRobot on `/api/health`, Sentry DSN on web and worker, Slack webhook. | Ops | P1 |
| 12 | Run the k6 load test (`tests/load/spin.k6.js`) against staging with a rate-limit override for the load generator. | Eng | P1 |
| 13 | Submit the sitemaps (`/robots.txt` lists them) in Google Search Console. | Growth | P1 |
| 14 | Refresh the JWT username after a change (`unstable_update`) so the header name updates without re-login. | Eng | P2 |
| 15 | Unsubscribe via GET is instant (per spec). If mail scanners cause false unsubscribes, switch GET to a confirm page and keep POST one-click. | Eng | P2 |
| 16 | Remaining blog posts per `marketing/content-calendar.md` (6 shipped, 50+ target). | Content | P2 |
| 17 | Referral tracking and the "Scout" badge (5 referrals). Not built yet. | Eng | P2 |
| 18 | Visual regression snapshots (Playwright `toHaveScreenshot`) for home, game and result pages once the design is frozen. | Eng | P2 |
| 19 | Framer Motion leaderboard reorder: skipped to keep the JS budget. Revisit if the leaderboard becomes live-updating. | Eng | P2 |
