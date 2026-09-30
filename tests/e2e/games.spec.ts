import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-17-0-rules', '1'); localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('17-0: spin, draft six slots one team at a time, grade, see result', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/games/17-0');
  await page.getByRole('button', { name: 'Start spinning' }).click();
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

test('Build a Player: position, five spins, assemble, grade', async ({ page }) => {
  await page.goto('/games/build-a-player');
  await page.getByRole('button', { name: /^QB/ }).click();
  await page.getByRole('button', { name: 'Build a QB' }).click();
  for (let i = 0; i < 5; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.g-slots li.filled')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Take the best of each' }).click();
  await page.getByRole('button', { name: 'Grade and simulate' }).click();
  await page.waitForURL(/\/results\//);
  await expect(page.getByText('Pass Yds')).toBeVisible();
});
