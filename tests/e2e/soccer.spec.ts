import { expect, test } from '@playwright/test';

// Stand-in clubs and players come from tests/e2e/global-setup.ts (ids from 9,900,000, names marked "Test").
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const [slug, rounds] of [['soccer-whose-club', 6], ['soccer-where-from', 6], ['soccer-top-scorer', 6], ['soccer-higher-lower', 10]] as const) {
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

test('Games page has a Soccer tab and the leaderboards list soccer games', async ({ page }) => {
  await page.goto('/games?sport=soccer');
  for (const name of ['Whose Club?', "Where's He From? Soccer", 'Higher or Lower: Goals', 'Top Scorer']) await expect(page.getByRole('link', { name: new RegExp(name.replace('?', '\\?')) })).toBeVisible();
  await page.goto('/leaderboard?game=soccer-whose-club');
  await expect(page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Soccer' })).toHaveAttribute('aria-current', 'page');
});
