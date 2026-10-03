import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
});

test('Sports Wordle casual: six misses reveal the player', async ({ page }) => {
  await page.goto('/games/sports-wordle');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.getByText(/· 5 letters · 6 tries/)).toBeVisible({ timeout: 20_000 });
  for (const w of ['QQQQQ', 'ZZZZZ', 'XXXXX', 'JJJJJ', 'VVVVV', 'WWWWW']) {
    for (const ch of w) await page.getByRole('button', { name: ch, exact: true }).click();
    await page.getByRole('button', { name: 'Enter' }).click();
  }
  await expect(page.locator('.m-score')).toHaveText(/^(X|\d)\/6/, { timeout: 20_000 });
  await expect(page.locator('.m-result .wd-grid')).toBeVisible();
});

test('Sports Connections casual: guesses are checked until the board ends', async ({ page }) => {
  await page.goto('/games/sports-connections');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.locator('.cx-tile')).toHaveCount(16, { timeout: 20_000 });
  for (let i = 0; i < 8 && !(await page.locator('.m-result').count()); i++) {
    const tiles = page.locator('.cx-tile');
    const n = await tiles.count();
    for (const k of [0, 1, 2, Math.min(n - 1, 3 + i)]) await tiles.nth(k).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('.cx-tile.on')).toHaveCount(0, { timeout: 10_000 }).catch(() => page.getByRole('button', { name: 'Deselect' }).click());
  }
  await expect(page.locator('.m-score')).toHaveText(/groups|Solved/, { timeout: 20_000 });
  await expect(page.locator('.m-result .cx-group')).toHaveCount(4);
});
