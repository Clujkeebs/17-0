import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

// A bot plays a whole Casual game: passes, runs, fourth downs, extra points, the other team's drives, halftime,
// the final and posting the score. Proves every stage of the game flows into the next.
test('Unbeaten Bowl: pick a team, play six drives, post the score', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(240_000);
  await page.goto('/games/unbeaten-bowl');
  await page.getByRole('tab', { name: 'Quick play' }).click();
  await page.locator('.bw-team').first().click();
  await expect(page.locator('.bw-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Kick off' }).click();
  const btn = (re: RegExp) => page.getByRole('button', { name: re }).first();
  let plays = 0;
  for (let i = 0; i < 500; i++) {
    await page.waitForTimeout(200);
    if (await btn(/^Post the score/).isVisible()) { await btn(/^Post the score/).click(); break; }
    for (const re of [/^Your ball|^Final$|^Halftime$/, /^Second half/, /^Kick the extra point/, /^Punt/]) {
      if (await btn(re).isVisible()) { await btn(re).click(); break; }
    }
    if (await btn(/^Pass$/).isVisible()) {
      plays++;
      const run = plays % 3 === 0;
      await btn(run ? /^Run/ : /^Pass$/).click();
      if (!run) { await page.waitForTimeout(1200); await page.keyboard.press(String(1 + (plays % 3))); }
    }
  }
  await expect(page.locator('.bw-lines')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.bw-lines tbody tr')).toHaveCount(2);
  expect(plays).toBeGreaterThan(5);
});

// GM mode: start a franchise, sim through a whole season, the playoffs, re-signing, the draft and free agency,
// and into next season. Then spend credits, check it survives a reload, and play one game on the field.
test('Unbeaten Bowl GM mode: a full season and offseason, then a game', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(300_000);
  await page.goto('/games/unbeaten-bowl?mode=gm');
  await page.getByLabel('Coach name').fill('Coach E2E');
  await page.locator('.bw-team').first().click();
  const head = page.locator('.gm-head');
  await expect(head).toContainText('Coach E2E');
  const year = Number((await head.textContent())!.match(/(\d{4}) season/)![1]);
  const btn = (re: RegExp) => page.getByRole('button', { name: re }).first();
  const steps = [/^Sim it$/, /^Next week$/, /^Play out the playoffs$/, /^Start the offseason$/, /^On to the draft$/, /^Best available$/, /^Start the \d{4} season$/];
  for (let i = 0; i < 120; i++) {
    if ((await head.textContent())!.includes(`${year + 1} season`)) break;
    const press = page.locator('.gm-answers button').first();
    if (await press.isVisible()) { await press.click(); continue; }
    for (const re of steps) {
      if (await btn(re).isVisible() && await btn(re).isEnabled()) { await btn(re).click(); break; }
    }
    if (await btn(/^Start the \d{4} season$/).isVisible() && !(await btn(/^Start the \d{4} season$/).isEnabled())) {
      // Over the roster limit: cut the last players listed until there is room.
      await page.getByRole('button', { name: 'Roster' }).click();
      page.once('dialog', (d) => void d.accept());
      await page.locator('.gm-roster tbody tr').last().getByRole('button', { name: 'Cut' }).click();
      await page.getByRole('button', { name: 'Home' }).click();
    }
  }
  await expect(head).toContainText(`${year + 1} season`);
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.locator('.gm-hist li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Power rankings' }).click();
  await expect(page.locator('.gm-table tbody tr')).toHaveCount(32);
  await page.getByRole('button', { name: 'Standings' }).click();
  await expect(page.locator('.gm-div')).toHaveCount(8);
  // Credits: upgrade the training facility, train a player.
  await page.getByRole('button', { name: 'Front office' }).click();
  await page.locator('.gm-up-card').first().getByRole('button', { name: /^Upgrade/ }).click();
  await expect(page.locator('.gm-up-card').first().locator('.gm-pips .on')).toHaveCount(2);
  await page.getByRole('button', { name: 'Roster' }).click();
  await page.getByRole('button', { name: /^Train \(/ }).first().click();
  await expect(page.getByRole('button', { name: 'Trained' }).first()).toBeVisible();
  // It is saved: a reload comes back to the same league.
  await page.reload();
  await page.getByRole('tab', { name: 'GM mode' }).click().catch(() => {});
  await expect(page.locator('.gm-head')).toContainText(`${year + 1} season`);
  // Play one game on the field.
  await page.getByRole('button', { name: 'Home' }).click();
  for (let i = 0; i < 3 && !(await btn(/^Play the game$/).isVisible()); i++) {
    if (await page.locator('.gm-answers button').first().isVisible()) await page.locator('.gm-answers button').first().click();
    else if (await btn(/^Next week$/).isVisible()) await btn(/^Next week$/).click();
  }
  await btn(/^Play the game$/).click();
  await page.getByRole('button', { name: 'Kick off' }).click();
  let plays = 0;
  for (let i = 0; i < 500; i++) {
    await page.waitForTimeout(200);
    if (await btn(/^Continue$/).isVisible()) { await btn(/^Continue$/).click(); break; }
    for (const re of [/^Your ball|^Final$|^Halftime$/, /^Second half/, /^Kick the extra point/, /^Punt/]) {
      if (await btn(re).isVisible()) { await btn(re).click(); break; }
    }
    if (await btn(/^Pass$/).isVisible()) {
      plays++;
      await btn(/^Pass$/).click();
      await page.waitForTimeout(1200); await page.keyboard.press(String(1 + (plays % 3)));
    }
  }
  await expect(page.locator('.gm-news li').first()).toContainText(/^(Won|Lost|Tied) \d+-\d+/);
  await expect(page.locator('.gm-name')).toContainText(/ (1-0|0-1|0-0-1)$/);
});
