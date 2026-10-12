import { expect, test } from '@playwright/test';
import postgres from 'postgres';

// Test databases have no Sleeper data; give skill players a stand-in projection so the tools have players.
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('gl-cookie-ack', '1')); });

test('fantasy hub links to every tool and rankings filter by position', async ({ page }) => {
  await page.goto('/fantasy');
  for (const name of ['Mock draft', 'Start or sit', 'Rankings', 'Waiver wire', 'Trade calculator', 'Draft cheat sheet', 'Draft order randomizer', 'Tier list maker']) await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
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
  // The printable sheet: hidden on screen, shown (and the rest hidden) when printing from the button.
  await expect(page.locator('.cs-print')).toBeHidden();
  await page.evaluate(() => { (window as unknown as { printed: boolean }).printed = false; window.print = () => { (window as unknown as { printed: boolean }).printed = true; }; });
  await page.getByRole('button', { name: 'Print or save as PDF' }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: boolean }).printed)).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.cs-print')).toBeVisible();
  await expect(page.locator('.cs-print')).toContainText('Pick 12');
  await expect(page.locator('.csp-col')).toHaveCount(4);
  await expect(page.locator('.cs-rounds')).toBeHidden();
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

test("Start 'Em: ten fantasy calls, scored against the rankings values", async ({ page }) => {
  await page.goto('/games/fantasy-start-em');
  await page.getByRole('tab', { name: 'Casual' }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.getByText(`Round ${i + 1} of 10`)).toBeVisible({ timeout: 20_000 });
    await page.locator('button.m-opt').first().click();
  }
  await expect(page.locator('.m-score')).toContainText('/10');
});

test("Rank 'Em: Fantasy orders five players and shows the true order", async ({ page }) => {
  await page.goto('/games/fantasy-rank-em');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.locator('.gc-item')).toHaveCount(5, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(page.getByText(/pairs in order/)).toBeVisible();
});

test('rankings: search, sort, tiers and league size', async ({ page }) => {
  await page.goto('/fantasy/rankings', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toHaveText('Overall rankings');
  await expect(page.locator('.f-row').first()).toBeVisible();
  await expect(page.locator('.fr-tier').first()).toContainText('Tier 1');
  // Search narrows the list to the name typed.
  const name = (await page.locator('.f-row .f-who strong').first().textContent())!;
  await page.getByLabel('Search players').fill(name.split(' ').pop()!);
  await expect(page.locator('.f-row').first()).toContainText(name);
  await page.getByLabel('Search players').fill('');
  // A position tab, with the address bar following it.
  await page.getByRole('button', { name: 'RB', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('RB rankings');
  await expect(page).toHaveURL(/pos=RB/);
  for (const pos of await page.locator('.f-row .f-who .muted').allTextContents()) expect(pos.startsWith('RB')).toBe(true);
  // Sorting by points a game puts the highest value first; league size and superflex are accepted.
  await page.getByLabel('Sort').selectOption('value');
  const nums = (await page.locator('.f-row .f-nums strong').allTextContents()).map(Number);
  expect([...nums].sort((x, y) => y - x)).toEqual(nums);
  await page.getByRole('radio', { name: '14 teams' }).click();
  await page.getByLabel('Superflex').check();
  await expect(page.locator('.md-pos-tabs')).toBeVisible();
  // The hub's "heating up" link opens the list sorted that way.
  await page.goto('/fantasy/rankings?sort=hot', { waitUntil: 'networkidle' });
  await expect(page.getByLabel('Sort')).toHaveValue('hot');
});

test('mock draft: set up, draft, the bots pick, auto-draft the rest, get a grade', async ({ page }) => {
  await page.goto('/fantasy/mock-draft', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('gl-mock-draft-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: '8 teams' }).click();
  await page.getByLabel('Your pick').selectOption('1');
  await page.getByRole('button', { name: 'Start the draft' }).click();
  await expect(page.locator('.md-clock-main')).toHaveText("You're on the clock");
  await expect(page.locator('.md-rec')).toContainText('Suggested:');
  // Draft the top player on the board.
  const top = page.locator('.md-row').first();
  const name = (await top.locator('strong').first().textContent())!;
  await top.getByRole('button', { name: /^Draft / }).click();
  await expect(page.locator('.md-team li.filled').first()).toContainText(name);
  // The computer teams pick on their own and hand it back.
  await expect(page.locator('.md-clock-main')).toContainText('is picking');
  await expect(page.locator('.md-clock-main')).toHaveText("You're on the clock", { timeout: 25_000 });
  await expect(page.locator('.md-feed li').first()).toBeAttached();
  // The full board shows every pick so far, and a refresh keeps the draft.
  await page.getByRole('button', { name: 'Full board' }).click();
  await expect(page.locator('.md-board thead th')).toHaveCount(9);
  await expect(page.locator('.md-board td.md-cell strong').first()).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.md-clock-main')).toHaveText("You're on the clock");
  await page.getByRole('button', { name: 'Auto-draft the rest' }).click();
  await expect(page.locator('.md-result')).toBeVisible();
  await expect(page.locator('.md-grade')).toHaveText(/^[ABCDF]\+?$/);
  await expect(page.locator('.md-standings li')).toHaveCount(8);
  await expect(page.locator('.md-lineup li')).toHaveCount(7);
  // Draft again starts a fresh one.
  await page.getByRole('button', { name: 'Draft again' }).click();
  await expect(page.locator('.md-result')).toHaveCount(0);
  await expect(page.locator('.md-clock')).toBeVisible();
});

test('start or sit: pick players, get a call, the link keeps them', async ({ page }) => {
  await page.goto('/fantasy/start-sit', { waitUntil: 'networkidle' });
  await expect(page.getByText('Start by searching for a player.')).toBeVisible();
  const pick = async (q: string, nth: number) => { await page.getByLabel(/^Add (a|another) player$/).fill(q); await page.locator('.ps-list button').nth(nth).click(); };
  await pick('a', 0);
  await expect(page.getByText('Add one more player to get a call.')).toBeVisible();
  await pick('e', 0);
  await expect(page.locator('.ss-verdict')).toBeVisible();
  await expect(page.locator('.ss-pill')).toHaveText(/Clear call|Lean|Toss-up/);
  await expect(page.locator('.ss-card')).toHaveCount(2);
  await expect(page).toHaveURL(/p=.+,.+/);
  const url = page.url();
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('.ss-card')).toHaveCount(2);
  // Remove one and the call goes away; four is the most.
  await page.getByRole('button', { name: /^Remove / }).first().click();
  await expect(page.locator('.ss-card')).toHaveCount(1);
  await expect(page.locator('.ss-pill')).toHaveCount(0);
});
