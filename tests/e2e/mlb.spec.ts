import { expect, test } from '@playwright/test';
import Redis from 'ioredis';
import postgres from 'postgres';

// Test databases have no Stats API history. Stand-in franchises (ids 9001+) and players (ids from 8,000,000,
// names marked "Test") give every era a full board so the whole 162-0 flow can run.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('162-0: era and team spins, eleven picks, hitters and pitchers kept apart, play the season', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/games/162-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  const newEra = page.getByRole('button', { name: /New era 2/ });
  await expect(newEra).toBeEnabled({ timeout: 20_000 });
  await newEra.click();
  await expect(page.getByRole('button', { name: /New era 1/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.g-player .g-player-pos').first()).toContainText(/ERA|HR/, { timeout: 20_000 });
  // The board is grouped by position.
  await expect(page.locator('.g-group-h', { hasText: 'Catchers' })).toBeVisible();
  await expect(page.locator('.g-group-h', { hasText: 'Relievers' })).toBeVisible();
  for (let i = 0; i < 11; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.mlb-slots li.filled')).toHaveCount(i + 1);
  }
  // A hitter cannot be moved onto the mound.
  const lf = page.locator('.mlb-slots li').nth(5), sp = page.locator('.mlb-slots li').nth(9);
  await lf.locator('button').click();
  await sp.locator('button').click();
  await expect(page.locator('.card-error')).toContainText('Hitters and pitchers cannot swap');
  await page.getByRole('button', { name: 'Play the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('162-0');
  await expect(page.locator('.big-num')).toHaveText(/^\d+-\d+$/);
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(11);
  const og = await page.request.get(await page.locator('figure img').first().getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('Games page has a Baseball tab with 162-0', async ({ page }) => {
  await page.goto('/games');
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Baseball' }).click();
  await expect(page).toHaveURL(/sport=mlb/);
  await expect(page.getByRole('link', { name: /162-0/ }).first()).toBeVisible();
});

test('162-0 Right now: this season only, team spin only', async ({ page }) => {
  await page.goto('/games/162-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Spin' }).locator('label', { hasText: /^Right now/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(/Right now · \d{4} season/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New team 2/ })).toBeVisible();
  // Take the catcher; every other catcher on later boards is then only draftable at DH.
  const c = page.locator('.g-group', { hasText: 'Catchers' }).locator('.g-player:not([disabled])').first();
  await c.click();
  await expect(page.locator('.mlb-slots li.filled')).toHaveCount(1);
});

for (const [slug, rounds] of [['mlb-higher-lower', 10], ['mlb-blind-resume', 6], ['mlb-who-led', 6], ['mlb-whose-team', 6]] as const) {
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
