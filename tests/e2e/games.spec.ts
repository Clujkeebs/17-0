import { expect, test } from '@playwright/test';
import Redis from 'ioredis';
import postgres from 'postgres';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-17-0-rules', '1'); localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

type Setup = { mode?: 'Today' | 'Casual'; scoring?: 'Ratings' | 'Fantasy'; roster?: '6' | '12' | '16' | '53'; players?: 'Current' | 'All-time'; difficulty?: 'Easy' | 'Hard' };
/** Fill in the 17-0 setup sheet and press Start. */
async function setup(page: import('@playwright/test').Page, s: Setup = {}) {
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await expect(sheet).toBeVisible();
  const pick = async (legend: string, label: string) => sheet.getByRole('group', { name: legend }).locator('label', { hasText: new RegExp(`^${label}`) }).click();
  await pick('Mode', s.mode ?? 'Casual');
  await sheet.getByRole('button', { name: /More options/ }).click();
  if (s.scoring) await pick('Scoring', s.scoring);
  if (s.roster) await pick('Roster', s.roster);
  if (s.players) await pick('Players', s.players);
  await pick('Difficulty', s.difficulty ?? 'Easy');
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(sheet).toBeHidden();
}

async function draftAll(page: import('@playwright/test').Page, n: number) {
  for (let i = 0; i < n; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.g-slots li.filled')).toHaveCount(i + 1);
  }
}

test('17-0: setup sheet, draft six slots one team at a time, grade, see result', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/games/17-0');
  await setup(page, { mode: 'Casual', roster: '6', players: 'Current', difficulty: 'Easy' });
  await draftAll(page, 6);
  await page.getByRole('button', { name: 'Simulate the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.getByText(/week by week/i).first()).toBeVisible();
  const og = await page.request.get(await page.locator('figure img').first().getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
  expect(errors).toEqual([]);
});

test('17-0: 16-man all-time roster drafts sixteen and grades', async ({ page }) => {
  test.setTimeout(120_000);
  // Test databases have no ESPN history: stand-in legends (names marked "Test Legend") on every franchise.
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  await sql`delete from nfl_legends where full_name like 'Test Legend%'`;
  await sql`insert into nfl_legends (espn_id, full_name, position, "group", team_id, season, grade, line)
    select 9000000 + t.id * 10 + g.n, 'Test Legend ' || g.grp || ' ' || t.abbreviation, g.pos, g.grp, t.id, 1994, 84 + g.n, g.line
    from teams t cross join (values (0, 'QB', 'QB', '4,000 pass yds, 30 TD'), (1, 'WR', 'WR', '100 rec, 1,400 yds, 12 TD'), (2, 'EDGE', 'DE', '15 sacks, 50 tkl')) as g(n, grp, pos, line)`;
  await sql.end();
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  await redis.del('legends:by-team');
  redis.disconnect();
  await page.goto('/games/17-0');
  await setup(page, { mode: 'Casual', roster: '16', players: 'All-time', difficulty: 'Easy' });
  await expect(page.locator('.g-slots li')).toHaveCount(16);
  await expect(page.locator('.g-legend-line').first()).toContainText('1994 ·', { timeout: 20_000 });
  await draftAll(page, 16);
  await page.getByRole('button', { name: 'Simulate the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('16-man roster');
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(16);
});

test('17-0: 53-man roster, teams repeat, five re-rolls, every spot filled', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/games/17-0');
  await setup(page, { mode: 'Casual', roster: '53', players: 'Current', difficulty: 'Easy' });
  await expect(page.locator('.g-slots li')).toHaveCount(54);
  await expect(page.locator('.g-respin .num')).toHaveText('5');
  await page.locator('.g-respin').click();
  await expect(page.locator('.g-respin .num')).toHaveText('4');
  await draftAll(page, 54);
  await page.getByRole('button', { name: 'Simulate the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('53-man roster');
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(54);
});

test('17-0 Today requires an account and locks the board to the classic six', async ({ page }) => {
  await page.goto('/games/17-0?mode=today');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('button', { name: /More options/ }).click();
  for (const g of ['Roster', 'Players']) for (const r of await sheet.getByRole('group', { name: g }).getByRole('radio').all()) await expect(r).toBeDisabled();
  await expect(sheet.getByRole('radio', { name: /^6/ })).toBeChecked();
  await expect(sheet.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Start' })).toBeDisabled();
});

test('Build a Player: five spins, one trait each, auto-grade', async ({ page }) => {
  await page.goto('/games/build-a-player');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await page.getByRole('button', { name: /^QB/ }).click();
  await page.getByRole('button', { name: 'Spin your first team' }).click();
  for (let i = 0; i < 5; i++) {
    const btn = page.locator('.b-trait:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    if (i < 4) await expect(page.locator('.g-slots li.filled')).toHaveCount(i + 1);
  }
  await page.waitForURL(/\/results\//, { timeout: 20_000 });
  await expect(page.getByText('Pass Yds')).toBeVisible();
  await expect(page.getByText(/best possible/)).toBeVisible();
});

test('17-0 Today requires an account', async ({ page }) => {
  await page.goto('/games/17-0?mode=today');
  await expect(page.getByText('Today is ranked')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
});

test('Higher or Lower casual round trip', async ({ page }) => {
  await page.goto('/games/higher-lower');
  for (let i = 0; i < 10; i++) {
    const btn = page.locator('.m-opt:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await btn.click();
  }
  await expect(page.locator('.m-score')).toHaveText(/\d+\/10/);
});

test('17-0 re-roll swaps the team on the clock', async ({ page }) => {
  await page.goto('/games/17-0?mode=casual');
  await setup(page, { mode: 'Casual', difficulty: 'Easy' });
  const reroll = page.getByRole('button', { name: /Re-roll 2/ });
  await expect(reroll).toBeEnabled({ timeout: 20_000 });
  await reroll.click();
  await expect(page.getByRole('button', { name: /Re-roll 1/ })).toBeVisible({ timeout: 20_000 });
});

test('17-0 hard mode: type to find players, overalls hidden, no re-rolls', async ({ page }) => {
  await page.goto('/games/17-0?mode=casual');
  const started = page.waitForResponse((r) => r.url().includes('/api/games/17-0/spin') && r.request().method() === 'POST');
  await setup(page, { mode: 'Casual', difficulty: 'Hard' });
  const body = await (await started).json();
  expect(body.hard).toBe(true);
  expect(body.respinsLeft).toBe(0);
  await expect(page.getByRole('button', { name: /Re-roll/ })).toHaveCount(0);
  const box = page.getByRole('searchbox');
  await expect(box).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.g-player')).toHaveCount(0);
  // Type the first two letters of each name we can find via the API-free way: try common letters until a match shows.
  for (const q of ['ja', 'ma', 'da', 'jo', 'ch', 'br', 'mi', 'ke', 'de', 'an']) {
    await box.fill(q);
    if (await page.locator('.g-player').count()) break;
  }
  await expect(page.locator('.g-player').first()).toBeVisible();
  await expect(page.locator('.g-player .g-ovr').first()).toHaveText('??');
});

test('build a player hard mode: ratings never reach the browser', async ({ page }) => {
  await page.goto('/games/build-a-player?mode=casual');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await page.getByRole('switch', { name: /Hard mode/ }).click();
  await expect(page.getByRole('switch', { name: /Hard mode/ })).toHaveAttribute('aria-checked', 'true');
  const started = page.waitForResponse((r) => r.url().includes('/api/games/build-a-player/spin') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Spin your first team' }).click();
  const body = await (await started).json();
  expect(body.hard).toBe(true);
  for (const p of body.team.players) { expect(p.ovr).toBe(-1); expect(p.attrs).toBeUndefined(); }
  const box = page.getByRole('searchbox');
  await expect(box).toBeVisible({ timeout: 20_000 });
  const first = String(body.team.players[0].name).split(' ')[0].slice(0, 3);
  await box.fill(first);
  const trait = page.locator('.b-trait').first();
  await expect(trait).toBeVisible();
  await expect(trait.locator('strong')).toHaveText('??');
  await trait.click();
  await expect(page.locator('.g-slots li.filled .g-slot-ovr').first()).toHaveText('??');
});

test('leaderboard has a Hard mode filter for 17-0', async ({ page }) => {
  await page.goto('/leaderboard?tab=daily&game=17-0');
  await page.getByRole('link', { name: 'Hard mode only' }).click();
  await expect(page).toHaveURL(/hard=1/);
  await expect(page.getByRole('link', { name: 'Hard mode only' })).toHaveAttribute('aria-current', 'page');
});

test('reel still spins with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/games/17-0?mode=casual');
  await setup(page, { mode: 'Casual' });
  const strip = page.locator('.reel2-strip').first();
  await expect(strip).toBeVisible({ timeout: 20_000 });
  // Reduce Motion must not zero the spin: the loading loop animates and the landing eases over 1.3s.
  const anim = await strip.evaluate((el) => { const c = getComputedStyle(el); return { name: c.animationName, dur: c.transitionDuration }; });
  expect(anim.name !== 'none' || anim.dur === '1.3s').toBe(true);
});

for (const [slug, rounds] of [['speed-trap', 8], ['odd-one-out', 6], ['numbers-game', 8], ['size-up', 8], ['vet-check', 8], ['division-line', 6]] as const) {
  test(`${slug} casual round trip`, async ({ page }) => {
    await page.goto(`/games/${slug}`);
    await page.getByRole('tab', { name: 'Casual' }).click();
    for (let i = 0; i < rounds; i++) {
      await expect(page.getByText(`Round ${i + 1} of ${rounds}`)).toBeVisible();
      await page.locator('button.m-opt').first().click();
    }
    await expect(page.locator('.m-score')).toContainText(`/${rounds}`);
  });
}

test('17-0 remembers the last setup: Fantasy and Hard come back without touching the sheet', async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  await sql`update players set fantasy_proj_ppg = round((overall_rating / 5.0)::numeric, 1), fantasy_games = 0
    where fantasy_proj_ppg is null and fantasy_ppg is null and is_active and position in ('QB','HB','FB','WR','TE')`;
  await sql.end();
  await page.goto('/games/17-0');
  await setup(page, { mode: 'Casual', scoring: 'Fantasy', difficulty: 'Hard' });
  // Leave the draft (an unfinished draft resumes instead of opening the sheet).
  await expect(page.getByRole('searchbox')).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/games/17-0');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('button', { name: /More options/ }).click();
  await expect(sheet.getByRole('group', { name: 'Mode' }).getByRole('radio', { name: /Casual/ })).toBeChecked();
  await expect(sheet.getByRole('group', { name: 'Scoring' }).getByRole('radio', { name: /Fantasy/ })).toBeChecked();
  await expect(sheet.getByRole('group', { name: 'Difficulty' }).getByRole('radio', { name: /Hard/ })).toBeChecked();
});

test('17-0 Fantasy: seven-man lineup scored on points per game', async ({ page }) => {
  // Test databases have no Sleeper data; give skill players a stand-in projection so the edition opens.
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  await sql`update players set fantasy_proj_ppg = round((overall_rating / 5.0)::numeric, 1), fantasy_games = 0
    where fantasy_proj_ppg is null and fantasy_ppg is null and is_active and position in ('QB','HB','FB','WR','TE')`;
  await sql.end();
  await page.goto('/games/17-0');
  await setup(page, { mode: 'Casual', scoring: 'Fantasy', difficulty: 'Easy' });
  await expect(page.locator('.g-slots li')).toHaveCount(7);
  await expect(page.locator('.g-slots')).toContainText('FLEX');
  await expect(page.locator('.g-fpts').first()).toHaveText(/^\d+\.\d$/, { timeout: 20_000 });
  await draftAll(page, 7);
  await page.getByRole('button', { name: 'Simulate the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('Fantasy');
  await expect(page.getByText('Points per week')).toBeVisible();
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(7);
  await expect(page.locator('.grade-table .grade-sub').first()).toContainText('pts/g');
});

test('leaderboards: every sport has its games, with Today, This week and All time', async ({ page }) => {
  await page.goto('/leaderboard');
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Basketball' }).click();
  await expect(page.getByRole('navigation', { name: 'Game' }).getByRole('link', { name: '82-0', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('navigation', { name: 'Game' }).getByRole('link', { name: 'Who Led?' }).click();
  await page.getByRole('navigation', { name: 'Period' }).getByRole('link', { name: 'This week' }).click();
  await expect(page).toHaveURL(/game=nba-who-led&period=week/);
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Baseball' }).click();
  await expect(page.getByRole('navigation', { name: 'Game' }).getByRole('link', { name: '162-0' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Overall' }).click();
  await expect(page.locator('.eyebrow').first()).toHaveText('Overall');
});
