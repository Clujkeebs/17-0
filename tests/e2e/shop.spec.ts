import { expect, test, type Browser, type Page } from '@playwright/test';
import postgres from 'postgres';

test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

async function signUp(page: Page, username: string, email?: string) {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(username);
  if (email) await page.locator('#reg-email').fill(email);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
}

test('shop: welcome points, buy a title, equip it, it shows on the profile', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const u = `shop_${String(Date.now()).slice(-9)}`;
  await signUp(page, u);
  await page.goto('/shop');
  await expect(page.getByTestId('balance')).toHaveText('50 pts');
  await page.getByRole('button', { name: 'Titles' }).click();
  const rookie = page.locator('.shop-card', { hasText: 'Rookie' });
  await rookie.getByRole('button', { name: '50 pts' }).click();
  await expect(page.getByRole('status')).toContainText('Rookie is yours');
  await expect(page.getByTestId('balance')).toHaveText('0 pts');
  // Too expensive now.
  await expect(page.locator('.shop-card', { hasText: 'Grinder' }).getByRole('button', { name: '200 pts' })).toBeDisabled();
  await rookie.getByRole('button', { name: 'Equip' }).click();
  await expect(rookie.getByRole('button', { name: /Equipped/ })).toBeVisible();
  await page.goto('/profile');
  await expect(page.locator('h1 .nm-title')).toHaveText('Rookie');
  // The API refuses what you cannot afford or do not own.
  expect((await page.request.post('/api/shop', { data: { action: 'buy', item: 'gold-foil' } })).status()).toBe(402);
  expect((await page.request.post('/api/shop', { data: { action: 'equip', kind: 'color', item: 'gold-foil' } })).status()).toBe(403);
  expect((await page.request.post('/api/shop', { data: { action: 'buy', item: 'commissioner' } })).status()).toBe(404);
  await sql`delete from user_accounts where username = ${u}`;
});

test('limited items never oversell: two players race for the last one, one wins', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  const stamp = String(Date.now()).slice(-9);
  const ctxA = await (browser as Browser).newContext(), ctxB = await (browser as Browser).newContext();
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  await signUp(a, `race_a_${stamp}`); await signUp(b, `race_b_${stamp}`);
  await sql`update user_accounts set points = 5000 where username in (${`race_a_${stamp}`}, ${`race_b_${stamp}`})`;
  await sql`insert into shop_stock (item_key, sold) values ('day-one', 19) on conflict (item_key) do update set sold = 19`;
  const [ra, rb] = await Promise.all([
    a.request.post('/api/shop', { data: { action: 'buy', item: 'day-one' } }),
    b.request.post('/api/shop', { data: { action: 'buy', item: 'day-one' } }),
  ]);
  expect([ra.status(), rb.status()].sort()).toEqual([200, 409]);
  const [{ sold }] = await sql`select sold from shop_stock where item_key = 'day-one'`;
  expect(sold).toBe(20);
  const owners = await sql`select count(*)::int as n from user_items where item_key = 'day-one' and user_id in (select id from user_accounts where username like ${`race_%_${stamp}`})`;
  expect(owners[0].n).toBe(1);
  await sql`delete from user_accounts where username like ${`race_%_${stamp}`}`;
  await sql`update shop_stock set sold = 0 where item_key = 'day-one'`;
  await ctxA.close(); await ctxB.close();
});

test('the owner owns every item, including exclusives nobody else can see', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const owner = 'clujkeebs@aol.com';
  await sql`delete from user_accounts where email = ${owner}`;
  await signUp(page, `own3_${String(Date.now()).slice(-9)}`, owner);
  await page.goto('/shop');
  await page.getByRole('button', { name: 'Titles' }).click();
  const comm = page.locator('.shop-card', { hasText: 'Commissioner' });
  await expect(comm.locator('.shop-tag')).toHaveText('Owner exclusive');
  // Owner defaults: Commissioner title, owner flair, ring and banner are already on.
  await expect(comm.getByRole('button', { name: /Equipped/ })).toBeVisible();
  await page.locator('.shop-card', { hasText: 'Day One' }).getByRole('button', { name: 'Equip' }).click();
  await expect(page.locator('.shop-card', { hasText: 'Day One' }).getByRole('button', { name: /Equipped/ })).toBeVisible();
  expect((await page.request.post('/api/shop', { data: { action: 'buy', item: 'teal' } })).status()).toBe(409);
  await page.goto('/profile');
  await expect(page.locator('.profile-head')).toHaveClass(/banner-founder/);
  await expect(page.locator('h1 .nm-title')).toHaveText('Day One');
  await sql`delete from user_accounts where email = ${owner}`;
});
