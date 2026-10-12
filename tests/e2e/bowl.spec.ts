import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

// A bot plays a whole Casual game: passes, runs, fourth downs, extra points, the other team's drives, halftime,
// the final and posting the score. Proves every stage of the game flows into the next.
test('Unbeaten Bowl: pick a team, play six drives, post the score', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(240_000);
  await page.goto('/games/unbeaten-bowl');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await page.locator('.bw-team').first().click();
  await expect(page.locator('.bw-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Kick off' }).click();
  const btn = (re: RegExp) => page.getByRole('button', { name: re }).first();
  let plays = 0;
  for (let i = 0; i < 500; i++) {
    await page.waitForTimeout(200);
    if (await btn(/^Post the score/).isVisible()) { await btn(/^Post the score/).click(); break; }
    for (const re of [/^Your ball|^Final$|^Halftime$/, /^Second half/, /^Kick the extra point/, /^Punt/]) {
      if (await btn(re).isVisible()) { await btn(re).click(); break; }
    }
    if (await btn(/^Pass$/).isVisible()) {
      plays++;
      const run = plays % 3 === 0;
      await btn(run ? /^Run/ : /^Pass$/).click();
      if (!run) { await page.waitForTimeout(1200); await page.keyboard.press(String(1 + (plays % 3))); }
    }
  }
  await expect(page.locator('.bw-lines')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.bw-lines tbody tr')).toHaveCount(2);
  expect(plays).toBeGreaterThan(5);
});
