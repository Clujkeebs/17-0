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

for (const slug of ['cbb-build-a-player', 'wcbb-build-a-player']) {
  test(`${slug}: a player and a skill from each of five programs`, async ({ page }) => {
    await page.goto(`/games/${slug}`);
    await page.getByRole('tab', { name: 'Casual' }).click();
    const build = page.getByRole('button', { name: 'Build my player' });
    await expect(build).toBeDisabled();
    const teams = page.locator('section.sb-club');
    await expect(teams).toHaveCount(5);
    const skills = ['Scoring', 'Rebounding', 'Playmaking', 'Steals', 'Blocks'];
    for (let i = 0; i < 5; i++) {
      await teams.nth(i).getByRole('radiogroup', { name: /players$/ }).getByRole('radio').first().click();
      await teams.nth(i).getByRole('radio', { name: skills[i] }).click();
    }
    // A skill given to a second program is taken from the first.
    await teams.nth(4).getByRole('radio', { name: 'Scoring' }).click();
    await expect(build).toBeDisabled();
    await teams.nth(0).getByRole('radio', { name: 'Blocks' }).click();
    await build.click();
    await expect(page.getByText('Your player', { exact: true })).toBeVisible();
    await expect(page.getByText('Best build on this board')).toBeVisible();
    await expect(page.locator('.m-big').first()).toContainText('pts');
  });
}

test('cfb-build-a-player: five different skills, one from each team', async ({ page }) => {
  await page.goto('/games/cfb-build-a-player');
  await page.getByRole('tab', { name: 'Casual' }).click();
  const build = page.getByRole('button', { name: 'Build my player' });
  await expect(build).toBeDisabled();
  const teams = page.locator('section.sb-club');
  await expect(teams).toHaveCount(5);
  for (let i = 0; i < 5; i++) await teams.nth(i).getByRole('radio').nth(i).click();
  // Team 1 cannot also supply the skill team 2 already gives.
  await expect(teams.nth(0).getByRole('radio').nth(1)).toBeDisabled();
  await expect(build).toBeEnabled();
  await build.click();
  await expect(page.getByText('Your player', { exact: true })).toBeVisible();
  await expect(page.getByText('Best build on this board')).toBeVisible();
  await expect(page.locator('.m-big').first()).toContainText('Build score');
});

test('Games hub has a College tab with all three leagues', async ({ page }) => {
  await page.goto('/games');
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'College' }).click();
  await expect(page).toHaveURL(/sport=college/);
  for (const slug of [...GAMES.map(([s]) => s), 'cfb-build-a-player', 'cbb-build-a-player', 'wcbb-build-a-player']) await expect(page.locator(`a.hub-card[href="/games/${slug}"]`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'College football', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: "Women's college basketball", exact: true })).toBeVisible();
});

test('the leaderboards have a College tab', async ({ page }) => {
  await page.goto('/leaderboard?game=cfb-higher-lower&period=today');
  await expect(page.getByRole('tab', { name: 'College' }).or(page.getByRole('link', { name: 'College' })).first()).toBeVisible();
});
