import { expect, test } from '@playwright/test';
import postgres from 'postgres';

// Test databases have no Sleeper data; give skill players a stand-in projection so the tools have players.
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
  // League settings change the math and ride along in the address bar, so a copied link opens the same trade.
  await page.getByRole('radio', { name: '14 teams' }).click();
  await page.getByLabel('Superflex').check();
  await expect(page).toHaveURL(/give=.+&get=.+&teams=14&sf=1/);
  const url = page.url();
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('.trade-list li')).toHaveCount(2);
  await expect(page.getByRole('radio', { name: '14 teams' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('Superflex')).toBeChecked();
  // An uneven trade offers a player to even it out; taking one adds him to the short side.
  const chips = page.locator('.trade-chip');
  if (await chips.count()) {
    const before = await page.locator('.trade-list li').count();
    await chips.first().click();
    await expect(page.locator('.trade-list li')).toHaveCount(before + 1);
  }
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

test('tier list: the pool starts full, tap or drag into tiers, add a custom entry, share keeps it all', async ({ page }) => {
  await page.goto('/fantasy/tier-list', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('gl-tier-list-v2'));
  await page.reload({ waitUntil: 'networkidle' });
  const pool = page.locator('[data-row="pool"] .tl-chip');
  expect(await pool.count()).toBeGreaterThan(20);
  // Tap a player, then a tier.
  await pool.first().click();
  await page.getByRole('button', { name: 'Move to S' }).click();
  await expect(page.locator('[data-row="S"] .tl-chip')).toHaveCount(1);
  // Drag the S player down into A (both rows on screen).
  await page.locator('[data-row="S"]').scrollIntoViewIfNeeded();
  const src = page.locator('[data-row="S"] .tl-chip').first(), dst = page.locator('[data-row="A"] .tl-items');
  const a = await src.boundingBox(), b = await dst.boundingBox();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + 40, b!.y + b!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('[data-row="A"] .tl-chip')).toHaveCount(1);
  await expect(page.locator('[data-row="S"] .tl-chip')).toHaveCount(0);
  await pool.first().click();
  await page.getByRole('button', { name: 'Move to S' }).click();
  // Position filter and a custom entry.
  await page.getByRole('button', { name: 'QB', exact: true }).click();
  for (const pos of await page.locator('[data-row="pool"] .tl-pos').allTextContents()) expect(pos).toBe('QB');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByLabel('Add a player or anyone else').fill('My cousin Ray');
  await page.getByRole('button', { name: /as a custom entry/ }).click();
  const ray = page.locator('[data-row="pool"] .tl-chip', { hasText: 'My cousin Ray' });
  await ray.click();
  await page.getByRole('button', { name: 'Move to F' }).click();
  await expect(page.locator('[data-row="F"] .tl-chip', { hasText: 'My cousin Ray' })).toBeVisible();
  await page.getByRole('button', { name: 'Share tier list' }).click();
  const link = await page.getByRole('dialog', { name: 'Share' }).getByRole('link', { name: /Text message/ }).getAttribute('href');
  const url = new URL(decodeURIComponent(link!.replace('sms:?&body=', '')));
  await page.goto(url.pathname + url.search);
  await expect(page.locator('[data-row="S"] .tl-chip')).toHaveCount(1);
  await expect(page.locator('[data-row="A"] .tl-chip')).toHaveCount(1);
  await expect(page.locator('[data-row="F"] .tl-chip', { hasText: 'My cousin Ray' })).toBeVisible();
});
