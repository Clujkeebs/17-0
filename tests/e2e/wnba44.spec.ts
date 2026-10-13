import { expect, test } from '@playwright/test';

// Test databases have no ESPN history. Stand-in WNBA franchises and players (ids from 9,000,000 up, names marked
// "Test") give every era and this season a full board so the whole 44-0 flow can run.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('44-0: five picks, move a player, play the season', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/games/44-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  for (let i = 0; i < 5; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.nba-slots li.filled')).toHaveCount(i + 1);
  }
  // Swap two spots: tap one, then the other.
  const pg = page.locator('.nba-slots li').nth(0), c = page.locator('.nba-slots li').nth(4);
  const before = await pg.locator('.g-slot-name').textContent();
  await pg.locator('button').click();
  await c.locator('button').click();
  await expect(c.locator('.g-slot-name')).toHaveText(before!);
  await page.getByRole('button', { name: 'Play the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('44-0');
  await expect(page.locator('.eyebrow').first()).toContainText('Current');
  await expect(page.locator('.big-num')).toHaveText(/^\d+-\d+$/);
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(5);
  const og = await page.request.get(await page.locator('figure img').first().getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('44-0 Current: this season only, no era spin', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/games/44-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(/^Current · 2024 season$/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New team 2/ })).toBeVisible();
  for (let i = 0; i < 5; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    if (i === 0) await expect(btn).toContainText('2024');
    await btn.click();
    await expect(page.locator('.nba-slots li.filled')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Play the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('Current');
});

test('44-0 hard mode hides stats and has no re-spins', async ({ page }) => {
  await page.goto('/games/44-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Difficulty' }).locator('label', { hasText: /^Hard/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByLabel(/Name a .* player/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await page.getByLabel(/Name a .* player/).fill('test');
  await expect(page.locator('.g-player').first()).toBeVisible();
  await expect(page.locator('.g-player .g-ovr').first()).toHaveText('??');
});

test('44-0 API: Today needs an account, a draft cannot be graded early, and it shows in the WNBA tab', async ({ request, page }) => {
  expect((await request.post('/api/wnba/44-0', { data: { action: 'start', daily: true } })).status()).toBe(401);
  const start = await request.post('/api/wnba/44-0', { data: { action: 'start' } });
  expect(start.status()).toBe(200);
  const s = await start.json();
  expect(s.total).toBe(5);
  expect(s.mode).toBe('now');
  expect(s.team.era).toBe('now');
  expect((await request.post('/api/wnba/44-0', { data: { action: 'grade', sessionId: s.sessionId, token: s.token } })).status()).toBe(400);
  await page.goto('/games?sport=wnba');
  await expect(page.getByRole('link', { name: /44-0/ }).first()).toBeVisible();
});
