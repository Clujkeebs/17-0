import { expect, test } from '@playwright/test';
import Redis from 'ioredis';
import postgres from 'postgres';

// Test databases have no ESPN history. Stand-in franchises and players (ids from 9,000,000 up, names marked
// "Test") give every era a full board so the whole 82-0 flow can run.
test.beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  const [{ n }] = await sql`select count(*)::int as n from nba_player_seasons where player_id >= 9000000`;
  if (n === 0) {
    const pos = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'];
    const eraSeasons = [1985, 1995, 2005, 2015, 2024];
    for (let t = 1; t <= 12; t++) {
      for (const season of eraSeasons) {
        await sql`insert into nba_team_seasons (team_id, season, name, location, abbreviation, color) values (${9000 + t}, ${season}, ${`Testers ${t}`}, ${'Test City'}, ${`T${t}`}, ${'#335577'}) on conflict do nothing`;
        for (let i = 0; i < 7; i++) {
          const id = 9000000 + t * 1000 + season - 1980 + i * 100;
          await sql`insert into nba_players (id, full_name, position) values (${id}, ${`Test ${pos[i]} ${t}-${season}`}, ${pos[i]}) on conflict do nothing`;
          await sql`insert into nba_player_seasons (player_id, team_id, season, gp, mpg, ppg, rpg, apg, spg, bpg, tov, fg_pct, value)
            values (${id}, ${9000 + t}, ${season}, 70, 30, ${10 + i * 2}, 5, 3, 1, 0.5, 2, 0.47, ${70 + i * 3}) on conflict do nothing`;
        }
      }
    }
  }
  // Standard (2K): stand-in overalls on 22 current rosters of six, so the edition opens.
  const [{ r }] = await sql`select count(distinct rating_2k)::int as r from nba_players where id >= 9500000 and rating_2k is not null`;
  if (r < 15) {
    for (let t = 1; t <= 22; t++) {
      await sql`insert into nba_team_seasons (team_id, season, name, location, abbreviation, color) values (${9000 + t}, 2024, ${`Testers ${t}`}, ${'Test City'}, ${`T${t}`}, ${'#335577'}) on conflict do nothing`;
      for (let i = 0; i < 6; i++) {
        const id = 9500000 + t * 10 + i;
        await sql`insert into nba_players (id, full_name, position, rating_2k, rating_2k_position, rating_2k_team_id) values (${id}, ${`Test 2K ${t}-${i}`}, ${['PG', 'SG', 'SF', 'PF', 'C', 'G'][i]}, ${70 + i * 3 + (t % 3)}, ${['PG', 'SG', 'SF', 'PF', 'C', 'G'][i]}, ${9000 + t})
          on conflict (id) do update set rating_2k = excluded.rating_2k, rating_2k_position = excluded.rating_2k_position, rating_2k_team_id = excluded.rating_2k_team_id`;
      }
    }
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    await redis.del('nba:2k-teams', 'nba:era-teams');
    redis.disconnect();
  }
  await sql.end();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('82-0: era and team spins, five picks, move a player, play the season', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/games/82-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  // One era re-spin, then picks.
  const newEra = page.getByRole('button', { name: /New era/ });
  await expect(newEra).toBeEnabled({ timeout: 20_000 });
  await newEra.click();
  await expect(newEra).toBeDisabled();
  for (let i = 0; i < 5; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.nba-slots li.filled')).toHaveCount(i + 1);
  }
  // Swap two spots: tap one, then the other.
  const pg = page.locator('.nba-slots li').nth(0), c = page.locator('.nba-slots li').nth(4);
  const before = await pg.locator('.g-slot-name').textContent();
  await pg.locator('button').click();
  await c.locator('button').click();
  await expect(c.locator('.g-slot-name')).toHaveText(before!);
  await page.getByRole('button', { name: 'Play the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('82-0');
  await expect(page.locator('.big-num')).toHaveText(/^\d+-\d+$/);
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(5);
  const og = await page.request.get(await page.locator('figure img').first().getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('82-0 Standard: 2K overalls, no era spin, credited result', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/games/82-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Edition' }).locator('label', { hasText: /^Standard/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('NBA 2K · current rosters')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New team 2/ })).toBeVisible();
  for (let i = 0; i < 5; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    if (i === 0) await expect(btn).toContainText('2K overall');
    await btn.click();
    await expect(page.locator('.nba-slots li.filled')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Play the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('Standard (2K)');
  await expect(page.getByRole('link', { name: 'NBA2KLab' })).toBeVisible();
});

test('82-0 hard mode hides stats and has no re-spins', async ({ page }) => {
  await page.goto('/games/82-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Difficulty' }).locator('label', { hasText: /^Hard/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByLabel(/Name a .* player/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await page.getByLabel(/Name a .* player/).fill('test');
  await expect(page.locator('.g-player').first()).toBeVisible();
  await expect(page.locator('.g-player .g-ovr').first()).toHaveText('??');
});

for (const [slug, rounds] of [['nba-higher-lower', 10], ['nba-blind-resume', 6], ['nba-who-led', 6], ['nba-whose-team', 6], ['nba-2k-higher-lower', 10]] as const) {
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

test("nba-2k-rank-em: order five, lock in, see the true 2K order", async ({ page }) => {
  await page.goto('/games/nba-2k-rank-em');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.getByText(/Rank by nba 2k overall/i)).toBeVisible();
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(page.getByText(/pairs in order/)).toBeVisible();
});

test('nba-2k-guess: six guesses, scored against the 2K overall', async ({ page }) => {
  await page.goto('/games/nba-2k-guess');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.getByText('Your guess: NBA 2K overall')).toBeVisible();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Lock in', exact: true }).click();
  await page.getByRole('button', { name: 'Lock in and score' }).click();
  await expect(page.locator('.m-score')).toContainText('pts');
});

test('Games page has a Basketball tab with 82-0 and the NBA puzzles', async ({ page }) => {
  await page.goto('/games');
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Basketball' }).click();
  await expect(page).toHaveURL(/sport=nba/);
  await expect(page.getByRole('link', { name: /82-0/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Who Led/ })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: /Build a Player/ })).toHaveCount(0);
});
