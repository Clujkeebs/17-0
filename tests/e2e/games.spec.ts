import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-17-0-rules', '1'); localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('17-0: spin, draft six slots, grade, see result', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/games/17-0');
  await page.getByRole('button', { name: /^Spin$/ }).click();
  await expect(page.getByRole('region', { name: /./ }).first()).toBeVisible();
  // Wait for all six teams to land.
  await expect(page.locator('.team-card')).toHaveCount(6);
  await expect(page.locator('.pbtn:not([disabled])').first()).toBeVisible({ timeout: 20_000 });

  const need = ['QB', 'RB', 'WR/TE', 'DEF', 'K', 'HC'];
  for (let attempt = 0; attempt < 3; attempt++) {
    const cards = page.locator('.team-card');
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i);
      if (await card.evaluate((el) => el.classList.contains('drafted'))) continue;
      const filled = await page.locator('.slot.filled .k').allInnerTexts();
      const open = need.filter((s) => !filled.includes(s));
      for (const slot of open) {
        await page.locator('.slot', { hasText: slot }).first().click(); // focus slot
        const btn = card.locator('.pbtn:not(.dim)').first();
        if (await btn.count()) { await btn.click(); break; }
        await page.locator('.slot', { hasText: slot }).first().click(); // unfocus
      }
    }
    if ((await page.locator('.slot.filled').count()) === 6) break;
  }
  await expect(page.locator('.slot.filled')).toHaveCount(6);
  await page.getByRole('button', { name: 'Grade My Roster' }).click();
  await page.waitForURL(/\/results\//);
  await expect(page.getByText('Slot grades')).toBeVisible();
  await expect(page.locator('.big-num')).toHaveText(/\d+-\d+/);
  const og = await page.request.get(await page.locator('figure img').getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
  expect(errors).toEqual([]);
});

test('Build a Player: position, spin, pool, assemble, grade', async ({ page }) => {
  await page.goto('/games/build-a-player');
  await page.getByRole('button', { name: /^QB/ }).click();
  await page.getByRole('button', { name: 'Spin five teams' }).click();
  await expect(page.locator('.team-card')).toHaveCount(5);
  await expect(page.locator('.team-card .pbtn:not([disabled])').first()).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 5; i++) await page.locator('.team-card').nth(i).locator('.pbtn').first().click();
  await page.getByRole('button', { name: 'Take the best of each' }).click();
  await page.getByRole('button', { name: 'Grade and simulate' }).click();
  await page.waitForURL(/\/results\//);
  await expect(page.getByText('Simulated season')).toBeVisible();
  await expect(page.getByText('Pass Yds')).toBeVisible();
});
