import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** A bot that plays one game start to finish: picks plays, snaps, throws or runs, kicks, clicks through every card. */
async function botPlays(page: Page, done: RegExp) {
  const btn = (re: RegExp) => page.getByRole('button', { name: re }).first();
  let plays = 0;
  for (let i = 0; i < 900; i++) {
    await page.waitForTimeout(200);
    if (await btn(done).isVisible()) { await btn(done).click(); return plays; }
    for (const re of [/^Your ball|^Final$|^Halftime$/, /^Second half/, /^Kick the extra point/, /^Punt/]) {
      if (await btn(re).isVisible()) { await btn(re).click(); break; }
    }
    const cards = page.locator('.bw-play');
    if (await cards.first().isVisible()) {
      plays++;
      const run = plays % 3 === 0;
      await (run ? page.locator('.bw-play.bw-run') : page.locator('.bw-play.bw-pass')).first().click();
      await btn(/^Snap$/).click();
      if (!run) { await page.waitForTimeout(1300); await page.keyboard.press(String(1 + (plays % 3))); }
    }
  }
  return plays;
}


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
  const plays = await botPlays(page, /^Post the score/);
  await expect(page.locator('.bw-lines')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.bw-lines tbody tr')).toHaveCount(2);
  expect(plays).toBeGreaterThan(5);
});

// GM mode: start a franchise, sim through a whole season, the playoffs, re-signing, the draft and free agency,
// and into next season. Then spend credits, check it survives a reload, and play one game on the field.
test('Unbeaten Bowl GM mode: a full season and offseason, then a game', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(420_000);
  await page.goto('/games/unbeaten-bowl?mode=gm');
  await page.getByLabel('Coach name').fill('Coach E2E');
  await page.locator('.bw-team').first().click();
  const head = page.locator('.gm-head');
  await expect(head).toContainText('Coach E2E');
  const year = Number((await head.textContent())!.match(/(\d{4}) season/)![1]);
  const btn = (re: RegExp) => page.getByRole('button', { name: re }).first();
  const steps = [/^Sim it$/, /^Next week$/, /^Play out the playoffs$/, /^Start the offseason$/, /^On to the draft$/, /^Best available$/, /^Start the \d{4} season$/];
  // Time-bound, not count-bound: under load many passes land mid-render and click nothing.
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
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
  await botPlays(page, /^Continue$/);
  await expect(page.locator('.gm-news li').first()).toContainText(/^(Won|Lost|Tied) \d+-\d+/);
  await expect(page.locator('.gm-name')).toContainText(/ (1-0|0-1|0-0-1)$/);
});

/** Gets past the kickoff and any opening drive by the other team, to the first play call. */
async function toFirstPlayCall(page: Page) {
  await page.goto('/games/unbeaten-bowl');
  await page.getByRole('tab', { name: 'Quick play' }).click();
  await page.locator('.bw-team').first().click();
  await page.getByRole('button', { name: 'Kick off' }).click();
  for (let i = 0; i < 60; i++) {
    if (await page.locator('.bw-play').first().isVisible()) return;
    const ball = page.getByRole('button', { name: /^Your ball/ });
    if (await ball.isVisible()) await ball.click();
    await page.waitForTimeout(200);
  }
  throw new Error('never reached a play call');
}

// Quick sim: the kickoff card offers it, and it plays all six of your drives from the ratings, straight to the final.
test('Unbeaten Bowl quick sim from the kickoff card goes straight to a final and posts the score', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(90_000);
  await page.goto('/games/unbeaten-bowl');
  await page.getByRole('tab', { name: 'Quick play' }).click();
  await page.locator('.bw-team').first().click();
  await page.getByRole('button', { name: 'Quick sim' }).click();
  await expect(page.locator('.bw-big').filter({ hasText: /^(You win\.|You lose\.|A tie\.)$/ })).toBeVisible();
  await page.getByRole('button', { name: /^Post the score/ }).click();
  await expect(page.locator('.bw-lines')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.bw-lines tbody tr')).toHaveCount(2);
});

// The playbook: dozens of plays in groups, with chalkboard art, and one from the book lines up for the snap.
test('Unbeaten Bowl: the playbook holds dozens of plays in groups and any of them lines up', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(90_000);
  await toFirstPlayCall(page);
  await page.getByRole('button', { name: 'Playbook' }).click();
  expect(await page.locator('.bw-book .bw-play').count()).toBeGreaterThanOrEqual(45);
  for (const h of ['Quick game', 'Mid range', 'Deep shots', 'Screens', 'Play action', 'Runs']) await expect(page.locator('.bw-book-h', { hasText: h })).toBeVisible();
  await expect(page.locator('.bw-book .bw-play svg path').first()).toBeVisible();
  await page.getByRole('button', { name: 'Play-action post' }).click();
  await expect(page.getByRole('button', { name: /^Snap$/ })).toBeVisible();
  await expect(page.locator('.bw-canvas')).toBeVisible();
});

// Sim the rest: from the first play call, the rest of the game is simulated and the game goes to its final.
test('Unbeaten Bowl: Sim the rest finishes the game from any play call', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(90_000);
  await toFirstPlayCall(page);
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Sim the rest' }).click();
  await expect(page.locator('.bw-big').filter({ hasText: /^(You win\.|You lose\.|A tie\.)$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Post the score/ })).toBeVisible();
});
