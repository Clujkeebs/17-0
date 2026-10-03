import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
// Cleanup runs inside the test: afterAll also runs in the skipped mobile worker, in parallel.
test.afterAll(async () => { await sql.end(); });

test("pick 'em: pick, change, locked at kickoff, right or wrong when final", async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await sql`delete from pickem_games where id like 'e2e%'`;
  const soon = new Date(Date.now() + 86_400_000), past = new Date(Date.now() - 3_600_000);
  // A started game keeps this fixture week the current one for the whole test.
  await sql`insert into pickem_games (id, season, week, kickoff, home_abbr, away_abbr, home_name, away_name, status) values
    ('e2e1', 2099, 1, ${soon}, 'BUF', 'KC', 'Buffalo Bills', 'Kansas City Chiefs', 'pre'),
    ('e2e2', 2099, 1, ${new Date(past.getTime() - 60_000)}, 'DET', 'GB', 'Detroit Lions', 'Green Bay Packers', 'in')`;
  const u = `pk_${Date.now().toString(36)}`;
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(u);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));

  await page.goto('/pickem');
  await expect(page.getByRole('heading', { level: 1, name: 'Week 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Kansas City Chiefs', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kansas City Chiefs, your pick' })).toBeVisible();
  await page.getByRole('button', { name: 'Buffalo Bills (home)' }).click();
  await expect(page.getByRole('button', { name: 'Buffalo Bills (home), your pick' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kansas City Chiefs', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('1 of 2 picked')).toBeVisible();
  // The started game is locked on the page and on the server.
  await expect(page.getByRole('button', { name: 'Detroit Lions (home)' })).toBeDisabled();
  expect((await page.request.post('/api/pickem', { data: { gameId: 'e2e2', pick: 'home' } })).status()).toBe(409);
  // The pick survived a reload.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Buffalo Bills (home), your pick' })).toBeVisible();

  // Final: Buffalo won, so the pick shows as right and counts in the standings.
  await sql`update pickem_games set status = 'post', winner = 'home', home_score = 24, away_score = 21, kickoff = ${past} where id = 'e2e1'`;
  await page.reload();
  await expect(page.locator('.pk-game.right')).toHaveCount(1);
  await expect(page.locator('.pk-game.right')).toContainText('Right');
  await expect(page.locator('#standings tr', { hasText: u }).first()).toContainText('1/1');
  await sql`delete from user_accounts where username = ${u}`;
  await sql`delete from pickem_games where id like 'e2e%'`;
});
