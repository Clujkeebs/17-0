import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/games', '/games/higher-lower', '/games/grid', '/games/mystery-player', '/games/wheres-he-from', '/games/blind-resume', '/games/rating-match', '/games/guess-the-ovr', '/games/top-ten', '/games/rank-em', '/games/name-that-team', '/games/speed-trap', '/games/odd-one-out', '/games/numbers-game', '/games/size-up', '/games/vet-check', '/games/division-line', '/games/17-0', '/games/build-a-player', '/games/82-0', '/games/162-0', '/games?sport=nba', '/games?sport=mlb', '/games?sport=puzzles', '/games/sports-connections', '/games/sports-wordle', '/games/sports-crossword', '/games/top-100-nfl-now', '/games/top-100-nba-all', '/fantasy', '/fantasy/rankings', '/fantasy/waivers', '/fantasy/trade', '/fantasy/cheat-sheet', '/fantasy/draft-order', '/fantasy/tier-list', '/games/nba-higher-lower', '/games/nba-blind-resume', '/games/nba-who-led', '/games/nba-whose-team', '/games/nba-2k-higher-lower', '/games/nba-2k-rank-em', '/games/nba-2k-guess', '/games?sport=soccer', '/games/soccer-whose-club', '/games/soccer-where-from', '/games/soccer-higher-lower', '/games/soccer-top-scorer', '/games/mlb-higher-lower', '/games/mlb-blind-resume', '/games/mlb-who-led', '/games/mlb-whose-team', '/leaderboard', '/shop', '/players', '/teams', '/coaches', '/positions', '/blog',
  '/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/disclaimer', '/legal/dmca', '/legal/accessibility', '/login', '/register'];

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); localStorage.setItem('gl-17-0-rules', '1'); }); });

for (const path of PAGES) {
  test(`renders ${path} without errors and passes axe`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/adsbygoogle|favicon|ERR_TUNNEL|ERR_NAME|ERR_CONNECTION|frame-ancestors/.test(m.text())) errors.push(m.text()); });
    const res = await page.goto(path);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('—');
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('every internal link on the homepage resolves', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = [...new Set(await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!)))];
  for (const h of hrefs) expect((await request.get(h)).status(), h).toBeLessThan(400);
});

test('newsletter signup responds without revealing state', async ({ request }) => {
  const a = await request.post('/api/newsletter/subscribe', { data: { email: `e2e+${Date.now()}@example.com`, source: 'e2e' } });
  expect(a.status()).toBe(200);
});

test('health endpoint', async ({ request }) => {
  const r = await request.get('/api/health');
  expect(r.status()).toBe(200);
  expect((await r.json()).db).toBeTruthy();
});

test('footer questionnaire sends a rating and a note', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run is enough');
  await page.goto('/blog');
  const form = page.locator('.footer-feedback');
  await form.getByRole('button', { name: 'Send feedback' }).click();
  await expect(form.getByRole('alert')).toHaveText('Pick a rating first.');
  await form.locator('label', { hasText: 'Good' }).click();
  await form.getByLabel(/What would you change/).fill('e2e: more games please');
  await form.getByRole('button', { name: 'Send feedback' }).click();
  await expect(form.getByRole('status')).toContainText('Thanks');
  expect((await request.post('/api/feedback', { data: { rating: 9 } })).status()).toBe(400);
});

test('players page searches as you type and links to the player', async ({ page }) => {
  await page.goto('/players', { waitUntil: 'networkidle' });
  const first = (await page.locator('table tbody tr td a').first().textContent())!.trim();
  await page.getByLabel('Search players').fill(first.slice(0, 1));
  const hit = page.locator('.ps-list a').first();
  await expect(hit).toBeVisible();
  await page.getByLabel('Search players').fill(first);
  await expect(page.locator('.ps-list a', { hasText: first }).first()).toBeVisible();
  await page.locator('.ps-list a', { hasText: first }).first().click();
  await expect(page).toHaveURL(/\/players\/[a-z0-9-]+$/);
});
