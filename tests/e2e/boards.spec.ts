import { expect, test } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-17-0-rules', '1'); localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function start17(page: import('@playwright/test').Page, difficulty: 'Easy' | 'Hard') {
  await page.goto('/games/17-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: /More options/ }).click();
  await sheet.getByRole('group', { name: 'Difficulty' }).locator('label', { hasText: new RegExp(`^${difficulty}`) }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
}

test('17-0 Hard: typing coach finds the head coach', async ({ page }) => {
  await start17(page, 'Hard');
  const box = page.getByRole('searchbox');
  await expect(box).toBeVisible({ timeout: 20_000 });
  await box.fill('coach');
  await expect(page.locator('.g-player').first()).toContainText('Head coach');
  await expect(page.locator('.g-player .g-ovr').first()).toHaveText('??');
});

test('17-0 normal mode: find a player by name above the board', async ({ page }) => {
  await start17(page, 'Easy');
  await expect(page.locator('.g-group').first()).toBeVisible({ timeout: 20_000 });
  const name = (await page.locator('.g-group .g-player .g-player-name').first().evaluate((e) => e.firstChild?.textContent ?? '')).trim();
  await page.getByRole('searchbox', { name: /Find a/ }).fill(name.split(' ').pop()!.slice(0, 4));
  await expect(page.locator('.g-group')).toHaveCount(0);
  await expect(page.locator('.g-player').filter({ hasText: name }).first()).toBeVisible();
  await expect(page.locator('.g-player .g-ovr').first()).not.toHaveText('??');
});

test('82-0: a team re-spin keeps the era, an era re-spin keeps the team', async ({ request }) => {
  const call = async (body: object) => (await request.post('/api/nba/82-0', { data: body })).json();
  const s = await call({ action: 'start', edition: 'classic' });
  const auth = { sessionId: s.sessionId, token: s.token };
  const t = await call({ action: 'respin', what: 'team', ...auth });
  expect(t.team.era).toBe(s.team.era);
  expect(t.team.id).not.toBe(s.team.id);
  const e = await call({ action: 'respin', what: 'era', ...auth });
  expect(e.team.id).toBe(t.team.id);
  expect(e.team.era).not.toBe(t.team.era);
});

test('82-0 normal mode: twelve players, find box, era reel', async ({ page }) => {
  await page.goto('/games/82-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('.era-reel')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.g-player').first()).toBeVisible({ timeout: 20_000 });
  expect(await page.locator('.g-player').count()).toBeLessThanOrEqual(12);
  await page.getByRole('searchbox', { name: /Find a/ }).fill('test');
  await expect(page.locator('.g-player').first()).toBeVisible();
});

test('after Today is played, 82-0 and 162-0 open on Casual instead of a locked board', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const u = `daily_${String(Date.now()).slice(-9)}`;
  await page.goto('/register');
  await page.locator('#reg-username').fill(u);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [{ id }] = await sql`select id from user_accounts where username = ${u}`;
  for (const g of ['82-0', '162-0']) await sql`insert into game_results (user_id, username, game_type, is_daily, daily_date, result_data, score) values (${id}, ${u}, ${g}, true, ${today}, '{"wins":50,"losses":32}', 50)`;
  // Even with Today remembered as the last mode, the sheet opens on Casual and says why.
  await page.evaluate(() => { localStorage.setItem('gl-82-0-setup', JSON.stringify({ mode: 'today' })); localStorage.setItem('gl-162-0-setup', JSON.stringify({ mode: 'today' })); });
  for (const g of ['82-0', '162-0']) {
    await page.goto(`/games/${g}`);
    const sheet = page.getByRole('dialog', { name: 'Game setup' });
    await expect(sheet.getByRole('group', { name: 'Mode' }).getByRole('radio', { name: /Casual/ })).toBeChecked();
    await expect(sheet.getByText('You already played Today')).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Start' })).toBeEnabled();
  }
  await sql`delete from user_accounts where username = ${u}`;
});
