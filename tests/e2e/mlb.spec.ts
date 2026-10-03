import { expect, test } from '@playwright/test';
import Redis from 'ioredis';
import postgres from 'postgres';

// Test databases have no Stats API history. Stand-in franchises (ids 9001+) and players (ids from 8,000,000,
// names marked "Test") give every era a full board so the whole 162-0 flow can run.
test.beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  const [{ n }] = await sql`select count(*)::int as n from mlb_player_seasons where player_id >= 8000000`;
  if (n === 0) {
    const pos = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
    const eraSeasons = [1975, 1985, 1995, 2005, 2015, 2024];
    await sql`insert into mlb_team_seasons (team_id, season, name, location, abbreviation)
      select 9000 + t, s, 'Testers ' || t, 'Test City', 'T' || t from generate_series(1, 14) t, unnest(${eraSeasons}::int[]) s on conflict do nothing`;
    for (let i = 0; i < pos.length; i++) {
      const kind = pos[i] === 'SP' ? 'sp' : pos[i] === 'RP' ? 'rp' : 'bat';
      const line = kind === 'bat' ? { pa: 600, ops: 0.8, hr: 20, sb: 5, avg: 0.28, obp: 0.35, slg: 0.45, rbi: 80 } : kind === 'sp' ? { gs: 30, g: 30, ip: 190, era: 3.4, so: 180, sv: 0, w: 14, whip: 1.15 } : { gs: 0, g: 60, ip: 62, era: 2.6, so: 70, sv: 30, w: 3, whip: 1.05 };
      await sql`insert into mlb_players (id, full_name, position)
        select 8000000 + t * 1000 + s - 1970 + ${i} * 100000, 'Test ' || ${pos[i]} || ' ' || t || '-' || s, ${pos[i]} from generate_series(1, 14) t, unnest(${eraSeasons}::int[]) s on conflict do nothing`;
      await sql`insert into mlb_player_seasons (player_id, team_id, season, kind, position, line, value)
        select 8000000 + t * 1000 + s - 1970 + ${i} * 100000, 9000 + t, s, ${kind}, ${pos[i]}, ${sql.json(line)}, 70 + ${i} + (t % 5) from generate_series(1, 14) t, unnest(${eraSeasons}::int[]) s on conflict do nothing`;
    }
  }
  // Right now: this season on 22 franchises (same formula as latestMlbSeason).
  const now = new Date(), y = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const [{ m }] = await sql`select count(distinct team_id)::int as m from mlb_player_seasons where season = ${y} and player_id >= 8000000`;
  if (m < 20) {
    const pos = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
    await sql`insert into mlb_team_seasons (team_id, season, name, location, abbreviation) select 9000 + t, ${y}, 'Testers ' || t, 'Test City', 'T' || t from generate_series(1, 22) t on conflict do nothing`;
    for (let i = 0; i < pos.length; i++) {
      const kind = pos[i] === 'SP' ? 'sp' : pos[i] === 'RP' ? 'rp' : 'bat';
      const line = kind === 'bat' ? { pa: 600, ops: 0.8, hr: 20, sb: 5, avg: 0.28, obp: 0.35, slg: 0.45, rbi: 80 } : kind === 'sp' ? { gs: 30, g: 30, ip: 190, era: 3.4, so: 180, sv: 0, w: 14, whip: 1.15 } : { gs: 0, g: 60, ip: 62, era: 2.6, so: 70, sv: 30, w: 3, whip: 1.05 };
      await sql`insert into mlb_players (id, full_name, position) select 8900000 + t * 100 + ${i}, 'Test Now ' || ${pos[i]} || ' ' || t, ${pos[i]} from generate_series(1, 22) t on conflict do nothing`;
      await sql`insert into mlb_player_seasons (player_id, team_id, season, kind, position, line, value)
        select 8900000 + t * 100 + ${i}, 9000 + t, ${y}, ${kind}, ${pos[i]}, ${sql.json(line)}, 72 + ${i} from generate_series(1, 22) t on conflict do nothing`;
    }
  }
  await sql.end();
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  await redis.del('mlb:era-teams');
  redis.disconnect();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('162-0: era and team spins, eleven picks, hitters and pitchers kept apart, play the season', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/games/162-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  const newEra = page.getByRole('button', { name: /New era 2/ });
  await expect(newEra).toBeEnabled({ timeout: 20_000 });
  await newEra.click();
  await expect(page.getByRole('button', { name: /New era 1/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.g-player .g-player-pos').first()).toContainText(/ERA|HR/, { timeout: 20_000 });
  // The board is grouped by position.
  await expect(page.locator('.g-group-h', { hasText: 'Catchers' })).toBeVisible();
  await expect(page.locator('.g-group-h', { hasText: 'Relievers' })).toBeVisible();
  for (let i = 0; i < 11; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.mlb-slots li.filled')).toHaveCount(i + 1);
  }
  // A hitter cannot be moved onto the mound.
  const lf = page.locator('.mlb-slots li').nth(5), sp = page.locator('.mlb-slots li').nth(9);
  await lf.locator('button').click();
  await sp.locator('button').click();
  await expect(page.locator('.card-error')).toContainText('Hitters and pitchers cannot swap');
  await page.getByRole('button', { name: 'Play the season' }).first().click();
  await page.waitForURL(/\/results\//);
  await expect(page.locator('.eyebrow').first()).toContainText('162-0');
  await expect(page.locator('.big-num')).toHaveText(/^\d+-\d+$/);
  await expect(page.locator('.grade-table tbody tr')).toHaveCount(11);
  const og = await page.request.get(await page.locator('figure img').first().getAttribute('src') as string);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('Games page has a Baseball tab with 162-0', async ({ page }) => {
  await page.goto('/games');
  await page.getByRole('navigation', { name: 'Sport' }).getByRole('link', { name: 'Baseball' }).click();
  await expect(page).toHaveURL(/sport=mlb/);
  await expect(page.getByRole('link', { name: /162-0/ }).first()).toBeVisible();
});

test('162-0 Right now: this season only, team spin only', async ({ page }) => {
  await page.goto('/games/162-0?mode=casual');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Spin' }).locator('label', { hasText: /^Right now/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(/Right now · \d{4} season/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /New era/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New team 2/ })).toBeVisible();
  // Take the catcher; every other catcher on later boards is then only draftable at DH.
  const c = page.locator('.g-group', { hasText: 'Catchers' }).locator('.g-player:not([disabled])').first();
  await c.click();
  await expect(page.locator('.mlb-slots li.filled')).toHaveCount(1);
});
