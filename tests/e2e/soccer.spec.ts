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

test('Build a Soccer Player: one season and one trait per club', async ({ page }) => {
  await page.goto('/games/build-a-soccer-player');
  await page.getByRole('tab', { name: 'Casual' }).click();
  const build = page.getByRole('button', { name: 'Build my player' });
  await expect(build).toBeDisabled();
  const clubs = page.locator('section.sb-club');
  await expect(clubs).toHaveCount(3);
  const traits = ['Finishing', 'Playmaking', 'Fitness'];
  for (let i = 0; i < 3; i++) {
    const c = clubs.nth(i);
    await c.getByRole('radio').first().click();
    await c.getByRole('radio', { name: traits[i] }).click();
  }
  // Giving a trait to a second club takes it from the first.
  await clubs.nth(2).getByRole('radio', { name: 'Finishing' }).click();
  await expect(build).toBeDisabled();
  await clubs.nth(0).getByRole('radio', { name: 'Fitness' }).click();
  await build.click();
  await expect(page.getByText('Your player', { exact: true })).toBeVisible();
  await expect(page.getByText('Best build on this board')).toBeVisible();
});
