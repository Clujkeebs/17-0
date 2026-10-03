import { expect, test } from '@playwright/test';
import Redis from 'ioredis';
import postgres from 'postgres';

// Test databases have no ESPN history. Stand-in franchises and players (ids from 9,000,000 up, names marked
// "Test") give every era a full board so the whole 82-0 flow can run.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('82-0: era and team spins, five picks, move a player, play the season', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/games/82-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  // One era re-spin, then picks.
  const newEra = page.getByRole('button', { name: /New era/ });
  await expect(newEra).toBeEnabled({ timeout: 20_000 });
  await newEra.click();
  await expect(newEra).toBeDisabled();
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
  await expect(page.locator('.eyebrow').first()).toContainText('82-0');
  await expect(page.locator('.big-num')).toHaveText(/^\d+-\d+$/);
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(5);
  const og = await page.request.get(await page.locator('figure img').first().getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('82-0 Standard: 2K overalls, no era spin, credited result', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/games/82-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Edition' }).locator('label', { hasText: /^Standard/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('NBA 2K · current rosters')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New team 2/ })).toBeVisible();
  for (let i = 0; i < 5; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    if (i === 0) await expect(btn).toContainText('2K overall');
    await btn.click();
    await expect(page.locator('.nba-slots li.filled')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Play the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('Standard (2K)');
  await expect(page.getByRole('link', { name: 'NBA2KLab' })).toBeVisible();
});

test('82-0 hard mode hides stats and has no re-spins', async ({ page }) => {
  await page.goto('/games/82-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Difficulty' }).locator('label', { hasText: /^Hard/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByLabel(/Name a .* player/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await page.getByLabel(/Name a .* player/).fill('test');
  await expect(page.locator('.g-player').first()).toBeVisible();
  await expect(page.locator('.g-player .g-ovr').first()).toHaveText('??');
});

for (const [slug, rounds] of [['nba-higher-lower', 10], ['nba-blind-resume', 6], ['nba-who-led', 6], ['nba-whose-team', 6], ['nba-2k-higher-lower', 10]] as const) {
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

test("nba-2k-rank-em: order five, lock in, see the true 2K order", async ({ page }) => {
  await page.goto('/games/nba-2k-rank-em');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.getByText(/Rank by nba 2k overall/i)).toBeVisible();
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(page.getByText(/pairs in order/)).toBeVisible();
});

test('nba-2k-guess: six guesses, scored against the 2K overall', async ({ page }) => {
  await page.goto('/games/nba-2k-guess');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.getByText('Your guess: NBA 2K overall')).toBeVisible();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Lock in', exact: true }).click();
  await page.getByRole('button', { name: 'Lock in and score' }).click();
  await expect(page.locator('.m-score')).toContainText('pts');
});

test('Games page has a Basketball tab with 82-0 and the NBA puzzles', async ({ page }) => {
  await page.goto('/games');
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Basketball' }).click();
  await expect(page).toHaveURL(/sport=nba/);
  await expect(page.getByRole('link', { name: /82-0/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Who Led/ })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: /Build a Player/ })).toHaveCount(0);
});
