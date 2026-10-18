import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import Redis from 'ioredis';

// The Undefeated view ranks who has gone undefeated the most in a draft game (17-0, 82-0, 162-0, 44-0). Rows are written
// straight to the database so every case is exact: the Casual cap, flagged results, a hidden player and Hard. Boards are
// cached in Redis under `cache:lb:...`, so the specs clear those keys after seeding.
test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });

const stamp = String(Date.now()).slice(-7);
const P = `ud${stamp}`;
const names = { a: `${P}_ann`, b: `${P}_bo`, c: `${P}_cy`, d: `${P}_dee`, e: `${P}_eve` };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
// Noon Eastern on a day offset from today, so a day's results never straddle midnight.
const noon = (daysAgo: number) => sql`((date_trunc('day', now() at time zone 'America/New_York') - make_interval(days => ${daysAgo}) + interval '12 hours') at time zone 'America/New_York')`;

async function result(user: string, game: string, wins: number, opts: { daily?: boolean; hard?: boolean; flagged?: boolean; daysAgo?: number; minute?: number } = {}) {
  const [u] = await sql`select id from user_accounts where username = ${user}`;
  await sql`insert into game_results (user_id, username, game_type, is_daily, daily_date, result_data, score, flagged, created_at)
    values (${u.id}, ${user}, ${game}, ${!!opts.daily}, ${opts.daily ? today() : null}, ${sql.json({ wins, hard: !!opts.hard })}, ${wins * 1000},
      ${!!opts.flagged}, ${noon(opts.daysAgo ?? 0)} + make_interval(mins => ${opts.minute ?? 0}))`;
}

test.beforeAll(async () => {
  for (const n of Object.values(names)) await sql`insert into user_accounts (username, email, display_name) values (${n}, ${n + '@x.test'}, ${n})`;
  await sql`update user_accounts set lb_hidden = true where username = ${names.e}`;
  // Ann: three perfect 17-0 seasons on three days (one on Hard), a 16-1, and one perfect 82-0.
  await result(names.a, '17-0', 17, { daysAgo: 2, hard: true });
  await result(names.a, '17-0', 17, { daysAgo: 1 });
  await result(names.a, '17-0', 17, { daysAgo: 0 });
  await result(names.a, '17-0', 16, { daysAgo: 0, minute: 5 });
  await result(names.a, '82-0', 82, { daysAgo: 0 });
  // Bo: seven Casual perfects in one day (only five count) and a ranked Today perfect: six in all.
  for (let i = 0; i < 7; i++) await result(names.b, '17-0', 17, { minute: i });
  await result(names.b, '17-0', 17, { daily: true, minute: 30 });
  // Cy: four perfect seasons on four days, two of them on Hard.
  for (let d = 0; d < 4; d++) await result(names.c, '17-0', 17, { daysAgo: d + 3, hard: d < 2 });
  // Dee's perfect seasons are flagged, and Eve is hidden from boards: neither appears.
  for (let i = 0; i < 3; i++) await result(names.d, '17-0', 17, { flagged: true, daysAgo: i });
  for (let i = 0; i < 10; i++) await result(names.e, '17-0', 17, { daysAgo: i });
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  for (const k of await redis.keys('cache:lb:perfect:*')) await redis.del(k);
  redis.disconnect();
});

test.afterAll(async () => {
  await sql`delete from game_results where username like ${P + '%'}`;
  await sql`delete from user_accounts where username like ${P + '%'}`;
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  for (const k of await redis.keys('cache:lb:perfect:*')) await redis.del(k);
  redis.disconnect();
  await sql.end();
});

/** Rank, name and count for this run's players only, in board order. */
async function board(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  const rows = page.locator('.lb-table tbody tr').filter({ hasText: P });
  return rows.evaluateAll((trs) => trs.map((tr) => ({ name: tr.querySelector('.nm')?.textContent?.trim() ?? '', count: Number(tr.querySelector('td.num strong')?.textContent) })));
}

test('17-0 Undefeated ranks perfect seasons, Casual capped at five a day, and leaves out flagged and hidden players', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  const rows = await board(page, '/leaderboard?game=17-0&period=undefeated');
  // Bo 5 + 1 Today, Cy 4, Ann 3. Dee (flagged) and Eve (hidden) are absent.
  expect(rows.map((r) => [r.name.replace(P + '_', ''), r.count])).toEqual([['bo', 6], ['cy', 4], ['ann', 3]]);
  await expect(page.locator('.eyebrow').first()).toContainText('17-0 · Undefeated');
  await expect(page.getByRole('navigation', { name: 'Period' }).getByRole('link', { name: 'Undefeated' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText(/capped at 5 a day/)).toBeVisible();
});

test('Hard mode only counts Hard perfect seasons', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  const rows = await board(page, '/leaderboard?game=17-0&period=undefeated&hard=1');
  expect(rows.map((r) => [r.name.replace(P + '_', ''), r.count])).toEqual([['cy', 2], ['ann', 1]]);
});

test('each draft game has its own board, and a game with no perfect season has no Undefeated view', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  const rows = await board(page, '/leaderboard?game=82-0&period=undefeated');
  expect(rows.map((r) => [r.name.replace(P + '_', ''), r.count])).toEqual([['ann', 1]]);
  for (const g of ['162-0', '44-0']) {
    expect(await board(page, `/leaderboard?game=${g}&period=undefeated`), `${g} has none of this run's players`).toEqual([]);
    await expect(page.getByRole('navigation', { name: 'Period' }).getByRole('link', { name: 'Undefeated' })).toBeVisible();
  }
  await page.goto('/leaderboard?game=higher-lower&period=undefeated');
  await expect(page.getByRole('navigation', { name: 'Period' }).getByRole('link', { name: 'Undefeated' })).toHaveCount(0);
  // The other views are untouched.
  await expect(page.getByRole('navigation', { name: 'Period' }).getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
});

test('the profile counts perfect seasons in every draft game, the way the boards do', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto(`/u/${names.a}`);
  // Ann: three in 17-0 and one in 82-0.
  await expect(page.locator('.stat', { hasText: 'Perfect seasons' }).locator('.v')).toHaveText('4');
  await page.goto(`/u/${names.b}`);
  await expect(page.locator('.stat', { hasText: 'Perfect seasons' }).locator('.v')).toHaveText('6');
});
