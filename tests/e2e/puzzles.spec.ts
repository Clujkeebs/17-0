import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
});

test('Sportle casual: six misses reveal the player', async ({ page }) => {
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
  // The page may load more than one casual puzzle; the answer key is the one whose layout is on screen.
  // Listen before the page loads: a fast first fetch would otherwise be missed.
  const seeds: string[] = [];
  page.on('response', async (r) => { if (r.url().includes('/api/mini/sports-crossword?mode=casual')) seeds.push((await r.json().catch(() => ({}))).seed); });
  await page.goto('/games/sports-crossword');
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

test('Sports Strands casual: drag one word, tap the rest, take a hint, clear the board', async ({ page }) => {
  const seeds: string[] = [];
  page.on('response', async (r) => { if (r.url().includes('/api/mini/sports-strands?mode=casual')) seeds.push((await r.json().catch(() => ({}))).seed); });
  await page.goto('/games/sports-strands');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.locator('.sx-cell')).toHaveCount(48, { timeout: 20_000 });
  const { buildStrands, wordAt, NEIGHBOURS } = await import('../../src/lib/minigames/puzzles/strands');
  const letters = await page.locator('.sx-cell').evaluateAll((els) => els.map((e) => e.textContent ?? '').join(''));
  const match = () => seeds.filter(Boolean).map((sd) => buildStrands(sd)).find((p) => p.letters.join('') === letters);
  await expect.poll(() => !!match(), { timeout: 10_000 }).toBe(true);
  const puzzle = match()!;
  const cell = (i: number) => page.locator(`.sx-cell[data-cell="${i}"]`);
  const tap = async (cells: number[]) => { for (const c of cells) await cell(c).click(); await cell(cells[cells.length - 1]).click(); };
  await expect(page.locator('.sx-theme')).toContainText(puzzle.theme);
  await expect(page.locator('.sx-count')).toContainText(`0 of ${puzzle.words.length} theme words found`);

  // Four letters that touch but are not a theme word are turned down, and the board stays as it was.
  let wrong: number[] = [];
  for (let a = 0; a < 48 && !wrong.length; a++) for (const b of NEIGHBOURS[a]) for (const c of NEIGHBOURS[b]) for (const d of NEIGHBOURS[c]) {
    const chain = [a, b, c, d];
    if (!wrong.length && new Set(chain).size === 4 && wordAt(puzzle, chain) < 0) wrong = chain;
  }
  expect(wrong).toHaveLength(4);
  await tap(wrong);
  await expect(page.locator('.sx-toast')).toContainText('Not a theme word');
  await expect(page.locator('.sx-count')).toContainText(`0 of ${puzzle.words.length}`);

  // Drag across the first word with the mouse: it counts as soon as the button is released.
  // On a phone the board can reach below the fold, and a mouse drag does not scroll: bring the whole board into view first.
  await page.locator('.sx-board').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const [first, ...rest] = puzzle.words;
  const centre = async (i: number) => { const b = (await cell(i).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const start = await centre(first.cells[0]);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  for (const c of first.cells.slice(1)) { const p = await centre(c); await page.mouse.move(p.x, p.y, { steps: 4 }); }
  await page.mouse.up();
  await expect(page.locator('.sx-count')).toContainText(`1 of ${puzzle.words.length}`);

  // A hint lights the letters of one unfound word and counts against you.
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(page.locator('.sx-hint').first()).toBeVisible();
  await expect(page.locator('.sx-count')).toContainText('1 hint');
  const lit = await page.locator('.sx-hint').count();
  expect(lit).toBeGreaterThanOrEqual(4);
  expect(rest.some((w) => w.cells.length === lit)).toBe(true);

  // Tap out the rest, one word at a time.
  for (const [k, w] of rest.entries()) {
    await tap(w.cells);
    if (k < rest.length - 1) await expect(page.locator('.sx-count')).toContainText(`${k + 2} of ${puzzle.words.length}`);
  }
  await expect(page.locator('.m-score')).toHaveText(/^Cleared · 1 hint · \d+:\d\d$/, { timeout: 20_000 });
  await expect(page.locator('.m-result .sx-board')).toBeVisible();
  await expect(page.locator('.m-result .sx-list li')).toHaveCount(puzzle.words.length);
});

test('Sports Strands: giving up shows every word, and ranked checks are recorded by the server', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/games/sports-strands');
  await page.getByRole('tab', { name: 'Casual' }).click();
  await expect(page.locator('.sx-cell')).toHaveCount(48, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Give up and see the answers' }).click();
  await expect(page.locator('.m-score')).toHaveText(/^0\/\d+ words$/, { timeout: 20_000 });
  await expect(page.locator('.m-result .sx-list li.miss').first()).toBeVisible();
  // The public puzzle never contains the answers, and Today needs an account.
  const casual = await (await request.get('/api/mini/sports-strands?mode=casual')).json();
  expect(Object.keys(casual.puzzle).sort()).toEqual(['cols', 'letters', 'rows', 'theme', 'total']);
  expect((await request.get('/api/mini/sports-strands?mode=today')).status()).toBe(401);
});
