import { expect, test } from '@playwright/test';

// Test databases have no ESPN history. Stand-in schools and players (ids from 9,100,000 up, names marked "Test") give
// every college game a full board so the flows can run.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const GAMES: [string, number][] = [
  ['cfb-higher-lower', 10], ['cfb-blind-resume', 6], ['cfb-who-led', 6], ['cfb-whose-team', 6],
  ['cbb-higher-lower', 10], ['cbb-blind-resume', 6], ['cbb-who-led', 6], ['cbb-whose-team', 6],
  ['wcbb-higher-lower', 10], ['wcbb-blind-resume', 6], ['wcbb-who-led', 6], ['wcbb-whose-team', 6],
];
for (const [slug, rounds] of GAMES) {
  test(`${slug} casual round trip`, async ({ page }) => {
    await page.goto(`/games/${slug}`);
    await page.getByRole('tab', { name: 'Casual' }).click();
    for (let i = 0; i < rounds; i++) {
      await expect(page.getByText(`Round ${i + 1} of ${rounds}`)).toBeVisible({ timeout: 20_000 });
      await page.locator('button.m-opt').first().click();
    }
    await expect(page.locator('.m-score')).toContainText(`/${rounds}`);
  });
}

test('Games hub has a College tab with all three leagues', async ({ page }) => {
  await page.goto('/games');
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'College' }).click();
  await expect(page).toHaveURL(/sport=college/);
  for (const slug of GAMES.map(([s]) => s)) await expect(page.locator(`a.hub-card[href="/games/${slug}"]`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'College football', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: "Women's college basketball", exact: true })).toBeVisible();
});

test('the leaderboards have a College tab', async ({ page }) => {
  await page.goto('/leaderboard?game=cfb-higher-lower&period=today');
  await expect(page.getByRole('tab', { name: 'College' }).or(page.getByRole('link', { name: 'College' })).first()).toBeVisible();
});
