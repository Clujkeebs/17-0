import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
});

test('Sports Wordle casual: six misses reveal the player', async ({ page }) => {
  await page.goto('/games/sports-wordle');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.getByText(/· 5 letters · 6 tries/)).toBeVisible({ timeout: 20_000 });
  for (const w of ['QQQQQ', 'ZZZZZ', 'XXXXX', 'JJJJJ', 'VVVVV', 'WWWWW']) {
    for (const ch of w) await page.getByRole('button', { name: ch, exact: true }).click();
    await page.getByRole('button', { name: 'Enter' }).click();
  }
  await expect(page.locator('.m-score')).toHaveText(/^(X|\d)\/6/, { timeout: 20_000 });
  await expect(page.locator('.m-result .wd-grid')).toBeVisible();
});

test('Sports Connections casual: guesses are checked until the board ends', async ({ page }) => {
  await page.goto('/games/sports-connections');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.locator('.cx-tile')).toHaveCount(16, { timeout: 20_000 });
  for (let i = 0; i < 8 && !(await page.locator('.m-result').count()); i++) {
    const tiles = page.locator('.cx-tile');
    const n = await tiles.count();
    for (const k of [0, 1, 2, Math.min(n - 1, 3 + i)]) await tiles.nth(k).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('.cx-tile.on')).toHaveCount(0, { timeout: 10_000 }).catch(() => page.getByRole('button', { name: 'Deselect' }).click());
  }
  await expect(page.locator('.m-score')).toHaveText(/groups|Solved/, { timeout: 20_000 });
  await expect(page.locator('.m-result .cx-group')).toHaveCount(4);
});

test('Sports Crossword casual: checks count mistakes, a full solve scores a time', async ({ page }) => {
  await page.goto('/games/sports-crossword');
  // The page may load more than one casual puzzle; the answer key is the one whose layout is on screen.
  const seeds: string[] = [];
  page.on('response', async (r) => { if (r.url().includes('/api/mini/sports-crossword?mode=casual')) seeds.push((await r.json().catch(() => ({}))).seed); });
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.locator('.xw-grid')).toBeVisible({ timeout: 20_000 });
  const { buildCrossword, solutionRows } = await import('../../src/lib/minigames/puzzles/crossword');
  const open = await page.locator('.xw-grid button').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? '').replace(/, (empty|[A-Z])$/, '')).sort());
  const match = () => seeds.filter(Boolean).map((sd) => solutionRows(buildCrossword(sd))).find((rows) => {
    const cells = rows.flatMap((line, r) => [...line].flatMap((ch, c) => (ch === '.' ? [] : [`Row ${r + 1}, column ${c + 1}`]))).sort();
    return JSON.stringify(cells) === JSON.stringify(open);
  });
  // The response body is read asynchronously; wait until the seed for the board on screen has arrived.
  await expect.poll(() => !!match(), { timeout: 10_000 }).toBe(true);
  const sol = match()!;
  const fill = async (pick: (ch: string) => string) => {
    for (const [r, line] of sol.entries()) for (const [c, ch] of [...line].entries()) {
      if (ch === '.') continue;
      await page.getByRole('button', { name: new RegExp(`^Row ${r + 1}, column ${c + 1},`) }).click();
      await page.keyboard.press(pick(ch));
    }
  };
  // Wrong letters everywhere: the board checks itself when full and says how many are wrong.
  await fill((ch) => (ch === 'Q' ? 'Z' : 'Q'));
  await expect(page.locator('.xw .hint')).toHaveText(/letters? (are|is) wrong/, { timeout: 10_000 });
  // Then the real answers: solved, scored as a time with one 10-second penalty.
  await fill((ch) => ch);
  await page.getByRole('button', { name: 'Check' }).click().catch(() => {});
  await expect(page.locator('.m-score')).toHaveText(/^\d+:\d\d/, { timeout: 20_000 });
  await expect(page.locator('.m-result .xw-grid')).toBeVisible();
});
