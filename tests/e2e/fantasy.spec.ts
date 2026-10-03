import { expect, test } from '@playwright/test';
import postgres from 'postgres';

// Test databases have no Sleeper data; give skill players a stand-in projection so the tools have players.
test.beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  await sql`update players set fantasy_proj_ppg = round((overall_rating / 5.0)::numeric, 1), fantasy_games = 0
    where fantasy_proj_ppg is null and fantasy_ppg is null and is_active and position in ('QB','HB','FB','WR','TE')`;
  await sql.end();
});
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('gl-cookie-ack', '1')); });

test('fantasy hub links to every tool and rankings filter by position', async ({ page }) => {
  await page.goto('/fantasy');
  for (const name of ['Rankings', 'Waiver wire', 'Trade calculator', 'Draft cheat sheet', 'Draft order randomizer', 'Tier list maker']) await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
  await page.goto('/fantasy/rankings?pos=TE');
  await expect(page.locator('h1')).toHaveText('TE rankings');
  await expect(page.locator('.f-row').first()).toBeVisible();
  for (const pos of await page.locator('.f-row .f-who .muted').allTextContents()) expect(pos.startsWith('TE')).toBe(true);
});

test('trade calculator gives a verdict', async ({ page }) => {
  await page.goto('/fantasy/trade', { waitUntil: 'networkidle' });
  const name = (await page.locator('body').evaluate(() => '')) || 'a';
  await page.getByLabel('Add to you give').fill(name);
  await page.locator('.ps-list button').first().click();
  await page.getByLabel('Add to you get').fill('e');
  await page.locator('.ps-list button').nth(1).click();
  await expect(page.locator('.trade-verdict .big-num')).toHaveText(/Fair|You win it|You lose it/);
});

test('cheat sheet shows targets for each pick', async ({ page }) => {
  await page.goto('/fantasy/cheat-sheet', { waitUntil: 'networkidle' });
  await page.getByLabel('Your pick').selectOption('12');
  await expect(page.locator('.cs-rounds > li').first()).toContainText('Pick 12');
  await expect(page.locator('.cs-rounds > li').nth(1)).toContainText('Pick 13');
  await expect(page.locator('.cs-targets li').first()).toBeVisible();
});

test('draft order randomizer orders every team', async ({ page }) => {
  await page.goto('/fantasy/draft-order', { waitUntil: 'networkidle' });
  await page.getByLabel(/Team names/).fill('Ana\nBo\nCy\nDee');
  await page.getByRole('button', { name: /Randomize 4 teams/ }).click();
  await expect(page.locator('.do-order li')).toHaveCount(4);
});

test('tier list: add a player, tap to move him into S, share link keeps him there', async ({ page }) => {
  await page.goto('/fantasy/tier-list', { waitUntil: 'networkidle' });
  await page.getByLabel('Add a player').fill('a');
  await page.locator('.ps-list button').first().click();
  const chip = page.locator('[data-tier="pool"] .tl-chip').first();
  await expect(chip).toBeVisible();
  await chip.click();
  await page.getByRole('button', { name: 'Move to tier S' }).click();
  await expect(page.locator('[data-tier="S"] .tl-chip')).toHaveCount(1);
  await page.getByRole('button', { name: 'Share tier list' }).click();
  const link = await page.getByRole('dialog', { name: 'Share' }).getByRole('link', { name: /Text message/ }).getAttribute('href');
  const url = new URL(decodeURIComponent(link!.replace('sms:?&body=', '')));
  await page.goto(url.pathname + url.search);
  await expect(page.locator('[data-tier="S"] .tl-chip')).toHaveCount(1);
});
