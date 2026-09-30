import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/games', '/games/higher-lower', '/games/grid', '/games/mystery-player', '/games/wheres-he-from', '/games/blind-resume', '/games/rating-match', '/games/guess-the-ovr', '/games/top-ten', '/games/rank-em', '/games/name-that-team', '/games/17-0', '/games/build-a-player', '/leaderboard', '/players', '/teams', '/coaches', '/positions', '/blog',
  '/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/disclaimer', '/legal/dmca', '/legal/accessibility', '/login', '/register'];

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); localStorage.setItem('gl-17-0-rules', '1'); }); });

for (const path of PAGES) {
  test(`renders ${path} without errors and passes axe`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/adsbygoogle|favicon|ERR_TUNNEL|ERR_NAME|ERR_CONNECTION/.test(m.text())) errors.push(m.text()); });
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
