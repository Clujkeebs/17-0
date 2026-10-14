import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import Redis from 'ioredis';

test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

async function signUp(page: Page, username: string) {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(username);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
}

test('the leaderboard shows each player\'s picture and banner, from a cached image URL and never inlined', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  const stamp = String(Date.now()).slice(-8);
  const [a, b] = [`pic_${stamp}`, `nopic_${stamp}`];
  await signUp(page, a);
  expect((await page.request.patch('/api/user/profile', { data: { image: PNG } })).status()).toBe(200);
  await sql`update user_accounts set points = 20000 where username = ${a}`;
  expect((await page.request.post('/api/shop', { data: { action: 'buy', item: 'banner-synthwave' } })).status()).toBe(200);
  expect((await page.request.post('/api/shop', { data: { action: 'equip', kind: 'banner', item: 'banner-synthwave' } })).status()).toBe(200);
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await signUp(p2, b);
  const ids = await sql`select id, username from user_accounts where username in (${a}, ${b})`;
  for (const [i, u] of ids.entries()) {
    await sql`insert into game_results (user_id, username, game_type, is_daily, daily_date, result_data, score) values (${u.id}, ${u.username}, 'higher-lower', true, ${today()}, '{"perfect":false}'::jsonb, ${900 - i * 10})`;
  }
  await sql`delete from game_results where game_type = 'higher-lower' and is_daily and daily_date = ${today()} and user_id not in (${ids[0].id}, ${ids[1].id})`;
  // Boards are cached for a minute: clear this one so the rows just inserted show.
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  await redis.del(`lb:daily:higher-lower:${today()}`);
  redis.disconnect();
  const html = await (await page.request.get('/leaderboard?game=higher-lower&period=today')).text();
  expect(html).not.toContain('data:image');
  await page.goto('/leaderboard?game=higher-lower&period=today');
  const plate = (u: string) => page.locator(`a.plate[href="/u/${u}"]`);
  await expect(plate(a)).toHaveClass(/banner-synthwave/);
  const pic = plate(a).locator('img.avatar');
  await expect(pic).toHaveAttribute('src', /^\/api\/avatar\/pic_\d+\?v=[0-9a-f]{8}$/);
  await expect.poll(() => pic.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  // Everyone else wears the free plain banner and ring, and a player without a picture gets initials.
  await expect(plate(b)).toHaveClass(/banner-plain/);
  await expect(plate(b).locator('.ring-plain')).toHaveCount(1);
  await expect(plate(b).locator('img.avatar')).toHaveCount(0);
  // The picture is a real, cacheable image.
  const src = await pic.getAttribute('src');
  const res = await page.request.get(src!);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
  expect(res.headers()['cache-control']).toContain('immutable');
  expect((await page.request.get('/api/avatar/nobody_here_x')).status()).toBe(404);
  // A board shows a soft tint of the banner, never the banner's drawing, with the Animations setting on or off. The reduced-motion banner rules are more specific than a plate and once put the art back under the name on exactly the devices that ask for less motion.
  const tint = () => plate(a).evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(await tint()).toMatch(/^linear-gradient/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(plate(a)).toHaveClass(/banner-synthwave/);
  expect(await tint()).toMatch(/^linear-gradient/);
  await sql`delete from game_results where user_id in (${ids[0].id}, ${ids[1].id})`;
  await sql`delete from user_accounts where username in (${a}, ${b})`;
  await ctx2.close();
});

test('everyone has the free basics, and wearing one goes back to plain', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const u = `basic_${String(Date.now()).slice(-8)}`;
  await signUp(page, u);
  await sql`update user_accounts set points = 5000 where username = ${u}`;
  await page.goto('/shop');
  const basics = page.locator('.basic-card');
  await expect(basics).toHaveCount(4);
  for (const label of ['Plain ring', 'Plain banner', 'Classic font', 'Ink color']) await expect(basics.filter({ hasText: label }).getByText('Wearing')).toBeVisible();
  // Buy and wear another ring: the plain one is no longer worn, and one tap brings it back.
  expect((await page.request.post('/api/shop', { data: { action: 'buy', item: 'ring-ink' } })).status()).toBe(200);
  await page.reload();
  await page.getByRole('button', { name: /^Avatar borders/ }).click();
  await page.locator('.shop-card', { hasText: 'Ink ring' }).getByRole('button', { name: 'Equip' }).click();
  await expect(page.locator('.shop-card', { hasText: 'Ink ring' }).getByRole('button', { name: /Equipped/ })).toBeVisible();
  const plainRing = basics.filter({ hasText: 'Plain ring' });
  await expect(plainRing.getByRole('button', { name: 'Wear' })).toBeVisible();
  await plainRing.getByRole('button', { name: 'Wear' }).click();
  await expect(plainRing.getByText('Wearing')).toBeVisible();
  // The free ones cannot be bought, and a plain ring card in the tab says it is free for everyone.
  expect((await page.request.post('/api/shop', { data: { action: 'buy', item: 'ring-plain' } })).status()).toBe(409);
  await expect(page.locator('.shop-card', { hasText: 'Plain ring' }).getByText('Free for everyone')).toBeVisible();
  await sql`delete from user_accounts where username = ${u}`;
});

test('buying updates the page at once: points drop and the card flips, with no reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const u = `buy_${String(Date.now()).slice(-8)}`;
  await signUp(page, u);
  // Settle the account's achievements first (after launch day the first look pays Early Adopter), then set a known balance.
  await page.goto('/profile');
  await sql`update user_accounts set points = 500 where username = ${u}`;
  await page.goto('/shop');
  await page.getByRole('button', { name: /^Avatar borders/ }).click();
  const card = page.locator('.shop-card', { hasText: 'Ink ring' });
  await expect(page.getByTestId('balance')).toHaveText('500 pts');
  await page.reload();
  await page.getByRole('button', { name: /^Avatar borders/ }).click();
  // A full reload would wipe this marker; the background router refresh keeps the document.
  await page.evaluate(() => { (window as unknown as { __kept?: number }).__kept = 1; });
  await card.getByRole('button', { name: '100 pts' }).click();
  await expect(card.getByRole('button', { name: 'Equip' })).toBeVisible();
  await expect(page.getByTestId('balance')).toHaveText(/^(400|410) pts$/);
  expect(await page.evaluate(() => (window as unknown as { __kept?: number }).__kept)).toBe(1);
  await sql`delete from user_accounts where username = ${u}`;
});

test('the Animations setting: follows a device that asks for reduced motion, and On brings the art back to life', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/shop');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(page.getByText('Your device asks for reduced motion')).toBeVisible();
  const art = page.locator('img.fx-img').first();
  await expect(art).toHaveAttribute('src', /\.still\.svg$/);
  await page.getByRole('button', { name: 'On', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await expect(art).toHaveAttribute('src', /fx-[a-z-]+\.svg$/);
  await expect(art).not.toHaveAttribute('src', /still/);
  expect(await page.evaluate(() => localStorage.getItem('gl-motion'))).toBe('on');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  // Off stands still even on a device that does not ask for it.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.getByRole('button', { name: 'Match my device' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  expect(await page.evaluate(() => localStorage.getItem('gl-motion'))).toBeNull();
});
