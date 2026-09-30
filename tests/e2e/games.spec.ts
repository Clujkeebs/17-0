import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-17-0-rules', '1'); localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('17-0: spin, draft six slots one team at a time, grade, see result', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/games/17-0');
  // Opening the page spins straight away (Casual when signed out).
  await expect(page.getByRole('tab', { name: 'Casual' })).toHaveAttribute('aria-selected', 'true');
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.g-slots li.filled')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Simulate the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.getByText(/week by week/i).first()).toBeVisible();
  const og = await page.request.get(await page.locator('figure img').first().getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
  expect(errors).toEqual([]);
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
