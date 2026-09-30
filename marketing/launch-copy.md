# Launch copy

All copy follows `DESIGN.md` section 6. No em-dashes, no emoji, no banned words, no "Madden" as branding, no user counts. Replace `https://unbeaten.example` with the production URL before posting.

## Tagline options

1. **Six picks. Seventeen games. One perfect season.**
2. Spin six teams. Draft one player from each. Try to go 17-0.
3. The perfect season is a math problem. Solve it daily.

**Pick: option 1.** It is the product in eight words, it has a rhythm people repeat, and the numbers do the work. Option 2 is the explainer line and goes directly under it wherever there is room. Option 3 is kept for the Show HN crowd.

---

## Product Hunt

**Name:** Unbeaten

**Tagline (60 chars max):** Six picks. Seventeen games. One perfect season.

**Description (260 chars max):**
A daily NFL puzzle. Six teams are spun, you draft one player from each, and a seeded simulation plays a 17-game season. Same six teams for everyone, so the leaderboard is fair. Built on EA Sports Madden NFL 27 ratings, updated weekly. Free, no gambling.

**First comment (maker):**

Hey Product Hunt. I built Unbeaten because my group chat kept arguing about whether a random roster could go undefeated, and nobody could prove anything.

How it works:

- Every morning, six NFL teams are drawn for everyone.
- You pick one player from each. Positions matter: six receivers will not survive a pass rush.
- The engine scores each pick with position weights built on EA Sports Madden NFL ratings, then simulates 17 games from a seeded random number generator.
- Same seed, same picks, same record. You can reproduce any result, which is also how we catch forged scores.

There is also Build a Player, where you build one player trait by trait, taking one trait from one player on each of five spins.

What it is not: a betting product. No money, no prizes, no odds. It is a daily puzzle with a leaderboard and a share card.

I would like feedback on the formulas more than anything. If you think a slot corner is weighted wrong, tell me why and show me the numbers.

---

## Show HN

**Title:** Show HN: Unbeaten, a daily NFL roster puzzle with a deterministic season simulator

**Body:**

Unbeaten is a daily puzzle: six NFL teams are drawn, you draft one player from each, and the site simulates a 17-game season. The goal is 17-0. https://unbeaten.example

The game part is simple. The engineering problems were more interesting than I expected:

**Deterministic simulation.** Every session gets a seed. The season sim uses a small seeded PRNG (sfc32, seeded from a cyrb128 hash of the session seed) and nothing else, so the same seed and picks always produce the same record. That gives us three things: the daily puzzle is identical for everyone, results are reproducible for debugging, and score submission can be verified server side. The client never tells the server "I went 16-1." It sends picks and an opaque session token; the seed lives on the server, which replays the season itself. Any use of `Math.random()` in the engine fails a unit test.

**Headless Chromium on Railway.** Player ratings are published as a web page, not an API we can rely on. A BullMQ worker runs Playwright with a Chromium binary on Railway, renders the ratings pages, parses them, diffs against the last snapshot, and writes changes with history. Getting Chromium to run reliably in a container meant pinning the browser build, running headless shell with conservative flags, capping concurrency to one page at a time, and treating every sync as a snapshot that can be rolled back. If a sync parses suspiciously few players, it is quarantined and the site shows a "data may be stale" banner instead of publishing garbage.

**BullMQ for everything slow.** Ratings sync, share card rendering (also Chromium, 1200x630 PNGs to object storage), and email all run as queued jobs with retries and backoff, so the web process only does request and response. Redis also backs rate limiting and a small read-through cache for leaderboards.

**Stack:** Next.js App Router (server components by default; the content pages ship no client JS), Postgres with Drizzle, Redis, NextAuth, Railway for web, worker, and cron.

Privacy note since people ask: no third-party analytics. IPs are salted and hashed before storage and only used for rate limiting. The site is ad-supported via AdSense, which is disclosed with a full cookie table.

Happy to go into the rating formulas, the anti-cheat replay, or the Chromium-in-a-container pain.

---

## Reddit

Post from a personal account with history in the sub. Read each sub's self-promotion rules first and message mods where required. Reply to every comment for the first three hours.

### r/nfl

**Title:** I built a daily puzzle: six random teams, one player from each, can your roster go 17-0?

**Body:**

Every morning the site spins six teams. You draft one player from each, and a simulation plays a 17-game season with your roster.

The part I care about: it is not just "add up the overalls." Positions are weighted, and a roster with no pass protection gets exposed the same way it would on Sundays. Six wide receivers goes about how you think.

Everyone gets the same six teams each day, so there is a daily leaderboard. No money involved, no ads for sportsbooks, just a puzzle.

It is free and you do not need an account to play: https://unbeaten.example

I would love to hear which picks people think are overrated by the engine. I have my own opinions about how it values off-ball linebackers.

### r/Madden

**Title:** Made a free daily game built on the current ratings: draft six players from six random teams and sim a season

**Body:**

I have spent too much time staring at the ratings, so I built something with them.

Six teams get spun. You take one player from each. The engine weights each player by position (a corner's man coverage and speed matter more than his carrying, obviously) and sims 17 games. The goal is 17-0.

Ratings update when EA updates them, and each player page shows the rating history so you can see who moved after each update.

There is a second mode, Build a Player, where you build one player trait by trait, taking one trait from one player on each of five spins.

Not affiliated with EA, just a fan project. Free, no account needed: https://unbeaten.example

Open to feedback on the position weights. If you think I have throw accuracy under or over-weighted, I want to hear it.

### r/fantasyfootball

**Title:** Offseason brain rot: a daily draft puzzle where you get one pick from each of six random teams

**Body:**

It is a draft, but you only get one pick per team and you have to fill a real roster. Some days the six teams give you a clean path. Some days the reel hands you an elite tight end and a quarterback you do not trust from the same team, and you have to pick one.

After you draft, it sims a 17-game season. Same teams for everyone each day, so you can compare against your league-mates.

Not fantasy scoring, and not a contest. Nothing to win, nothing to pay. Just a daily puzzle to argue about in the group chat: https://unbeaten.example

### r/webdev

**Title:** I built a deterministic sports sim with server-side replay to stop score forging. Here is what I learned.

**Body:**

Side project, launched this week: https://unbeaten.example (daily NFL roster puzzle, the goal is a 17-0 season).

A few things that might be useful to others:

1. **Replay instead of trust.** The client never submits a score. It submits picks plus an opaque, single-use session token. The seed never leaves the server, which replays the simulation and computes the score itself. There is no score field to forge.
2. **One PRNG, no exceptions.** sfc32, seeded from a cyrb128 hash of the session seed. A unit test bans `Math.random()` inside the engine.
3. **Playwright in production.** Ratings come from a rendered web page, so a BullMQ worker on Railway runs headless Chromium. Pin the browser build, run one page at a time, and snapshot every run so a bad parse can be rolled back.
4. **Zero-JS content pages.** Player, team, and legal pages are server components with no client bundle beyond the framework runtime. Only the game itself hydrates.
5. **Privacy by default.** No third-party analytics. IPs are salted and hashed with SHA-256 before storage, used only for rate limits.

Stack: Next.js App Router, Postgres with Drizzle, Redis, BullMQ, Railway. Happy to answer questions about any of it.

---

## X thread (6 posts)

1/
Six NFL teams. One player from each. A 17-game season.

Can your roster go 17-0?

Unbeaten is live. A new puzzle every morning, same six teams for everyone.
https://unbeaten.example

2/
It is not "sum the overalls."

Every pick is scored with position weights built on EA Sports Madden NFL ratings. A roster with no pass protection plays like one.

3/
Every season is simulated from a seeded random number generator.

Same seed, same picks, same record. Always. That is what makes the daily leaderboard fair.

4/
It also means scores cannot be forged. The site never trusts a submitted result. It replays your season on the server and checks.

5/
Second mode: Build a Player. Five spins, one trait from each, then see how he grades against the best build those teams allowed.

6/
Free. No account needed to play. No gambling, no prizes, no odds. Not affiliated with EA or the NFL.

Post your record. Somebody has to go 17-0 first.
https://unbeaten.example

---

## Cold outreach email (bloggers, newsletter writers, podcasters)

**Subject:** A daily NFL puzzle your audience can argue about

Hi {first name},

I have been reading/listening to {publication or show} since {specific episode or post, with one sentence on why it stuck with you}.

I built Unbeaten, a free daily puzzle: six NFL teams are drawn, you draft one player from each, and a simulation plays a 17-game season. Everyone gets the same six teams, so it works well as a recurring segment ("today's board: here is my roster, here is my record, beat it").

A few things that might be useful for {publication or show}:

- A custom daily board with your name on the leaderboard, if you want to run a listener or reader challenge.
- Share cards that render your roster and record as an image, ready for social.
- I am happy to walk through how the simulation weights positions. It makes for a decent argument.

No affiliation with EA or the NFL, no gambling, nothing to sell. Here is today's puzzle: https://unbeaten.example

If it is not a fit, no reply needed. Thanks for reading this far.

{Name}
Unbeaten
{mailing address}

---

## Giveaway rules template

Use only if we run a promotional giveaway (for example, signed merch for launch). The prize is never tied to game performance. This avoids any appearance of a game of skill or chance for consideration.

**Unbeaten Launch Giveaway: Official Rules**

1. **NO PURCHASE OR PAYMENT NECESSARY TO ENTER OR WIN.** A purchase or payment will not increase your chances of winning.
2. **Sponsor:** Unbeaten, {mailing address}.
3. **Eligibility:** Legal residents of the 50 United States and D.C., 18 or older at time of entry. Void where prohibited. Employees of the Sponsor and their immediate families are not eligible.
4. **Entry period:** {start date and time ET} to {end date and time ET}.
5. **How to enter:** Submit the free entry form at {URL} with your name and email. Limit one entry per person. Alternative method of entry: mail a 3x5 card with your name, email, and mailing address to the Sponsor address above, postmarked by {date}. Mail-in entries are treated identically.
6. **Winner selection:** {number} winner(s) selected by random draw from all eligible entries on or about {date}. **The draw is purely random and does not consider game scores, records, leaderboard position, skill, or any other performance.** Playing any game on the site is not required and has no effect on odds of winning.
7. **Odds** of winning depend on the number of eligible entries received.
8. **Prize:** {description}. Approximate retail value: ${ARV}. No cash alternative or substitution except by Sponsor if the prize becomes unavailable. Winner is responsible for any taxes.
9. **Notification:** Winners notified by email within 7 days of the draw and must respond within 7 days, or an alternate winner will be drawn.
10. **Privacy:** Entry information is used only to administer this giveaway and is deleted within 90 days after it ends, except the winner list kept as required by law. Entering does not subscribe you to the newsletter unless you separately opt in.
11. **General:** Not sponsored, endorsed, or administered by, or associated with, Electronic Arts, EA Sports, the NFL, the NFLPA, any team, or any social platform. Sponsor may cancel or modify the giveaway if fraud or technical failure compromises it. Governed by California law.
12. **Winner list:** Send a request to {legal email} within 60 days after the end date.

Check state requirements before launch: New York and Florida require registration and bonding for prizes over $5,000 in total value. Keep total ARV under $5,000 to avoid that.
