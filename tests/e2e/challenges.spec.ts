import { expect, test, type Browser, type Page } from '@playwright/test';
import postgres from 'postgres';

test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

async function player(browser: Browser, username: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => { localStorage.setItem('gl-17-0-rules', '1'); localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/register');
  await page.locator('#reg-username').fill(username);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
  return page;
}

/** Names on the board on the clock, once the reel has landed. */
async function boardNames(page: Page) {
  await expect(page.locator('.g-player').first()).toBeVisible({ timeout: 20_000 });
  return page.locator('.g-player .g-player-name').evaluateAll((els) => els.map((e) => (e.firstChild?.textContent ?? '').trim()));
}

async function draftAll(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const btn = page.locator('.g-player:not([disabled])').last();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.g-slots li.filled')).toHaveCount(i + 1);
  }
}

test('17-0 challenge: same spins for a friend, a shared board, and a head-to-head', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(150_000);
  const stamp = String(Date.now()).slice(-9); // digits only: random letters can trip the username filter
  const a = `cha_${stamp}`, b = `chb_${stamp}`;

  // A plays a Casual 6-man game and turns it into a challenge.
  const pa = await player(browser, a);
  await pa.goto('/games/17-0?mode=casual');
  const sheet = pa.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  const firstA = await boardNames(pa);
  await draftAll(pa, 6);
  await pa.getByRole('button', { name: 'Simulate the season' }).first().click();
  await pa.waitForURL(/\/results\//);
  await pa.getByRole('button', { name: 'Challenge friends' }).click();
  await pa.waitForURL(/\/c\/[A-Za-z0-9_-]+$/);
  const url = new URL(pa.url()).pathname;
  await expect(pa.getByRole('heading', { level: 1 })).toContainText('Your');
  await expect(pa.getByRole('button', { name: 'Send the challenge' })).toBeVisible();
  // The same result always gives the same challenge.
  const resultId = await sql`select creator_result_id as id from challenges where id = ${url.split('/').pop()!}`;
  const again = await pa.request.post('/api/challenges', { data: { resultId: resultId[0].id } });
  expect((await again.json()).url).toBe(url);

  // B opens the link: no setup sheet, the same first board, the challenge banner.
  const pb = await player(browser, b);
  await pb.goto(url);
  await expect(pb.getByRole('heading', { level: 1 })).toContainText(`${a} went`);
  await expect(pb.getByText('stays hidden until you finish')).toBeVisible();
  await pb.getByRole('link', { name: 'Play this challenge' }).click();
  await pb.waitForURL(/\/games\/17-0\?challenge=/);
  await expect(pb.getByRole('dialog', { name: 'Game setup' })).toBeHidden();
  await expect(pb.locator('.g-challenge')).toContainText(`same spins as ${a}`);
  expect(await boardNames(pb)).toEqual(firstA);
  await draftAll(pb, 6);
  await pb.getByRole('button', { name: 'Simulate the season' }).first().click();
  await pb.waitForURL(/\/results\//);
  await pb.getByRole('link', { name: 'See the head-to-head' }).click();
  await pb.waitForURL(/\/c\/.+\?r=/);
  await expect(pb.locator('.ch-verdict')).toBeVisible();
  await expect(pb.getByRole('heading', { name: 'Spot by spot' })).toBeVisible();
  await expect(pb.locator('.ch-table tbody tr')).toHaveCount(6);
  await expect(pb.locator('.ch-list li')).toHaveCount(2);
  await expect(pb.locator('.ch-list li.you')).toContainText(b);
  await expect(pb.getByRole('link', { name: 'Play this challenge' })).toHaveCount(0);

  // Today results cannot become challenges; unknown results are 404.
  const [daily] = await sql`insert into game_results (game_type, is_daily, daily_date, result_data, score) values ('17-0', true, '2099-01-01', '{"wins":1,"losses":16}', 1) returning id`;
  expect((await pb.request.post('/api/challenges', { data: { resultId: daily.id } })).status()).toBe(400);
  expect((await pb.request.post('/api/challenges', { data: { resultId: '00000000-0000-4000-8000-000000000000' } })).status()).toBe(404);
  await sql`delete from game_results where id = ${daily.id}`;
  await sql`delete from user_accounts where username in (${a}, ${b})`;
});

test('162-0 challenge: two starts from one challenge draw the same board', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop');
  const call = async (body: object) => { const r = await request.post('/api/mlb/162-0', { data: body }); return { status: r.status(), d: await r.json() }; };
  const first = await call({ action: 'start', mode: 'eras' });
  test.skip(first.status === 503, 'No MLB data in this database yet');
  let s = first.d;
  const auth = { sessionId: s.sessionId, token: s.token };
  while (!s.done) {
    const taken = new Set(s.roster.filter((r: { pick: unknown }) => r.pick).map((r: { slot: string }) => r.slot));
    const p = s.team.players.find((x: { fits: string[] }) => x.fits.some((f) => !taken.has(f))) ?? s.team.players[0];
    s = { ...s, ...(await call({ action: 'pick', playerId: p.id, ...auth })).d };
  }
  const graded = await call({ action: 'grade', ...auth });
  expect(graded.status).toBe(200);
  const ch = await request.post('/api/challenges', { data: { resultId: graded.d.id } });
  expect(ch.status()).toBe(200);
  const { id } = await ch.json();
  const x = (await call({ action: 'start', challenge: id })).d, y = (await call({ action: 'start', challenge: id })).d;
  expect([x.team.id, x.team.era]).toEqual([first.d.team.id, first.d.team.era]);
  expect([y.team.id, y.team.era]).toEqual([first.d.team.id, first.d.team.era]);
  expect(x.team.players.map((p: { id: number }) => p.id)).toEqual(first.d.team.players.map((p: { id: number }) => p.id));
  expect((await call({ action: 'start', challenge: 'nope-not-real' })).status).toBe(404);
});
