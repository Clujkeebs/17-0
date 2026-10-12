import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';

// Free drops are one global thing (a single live drop for everybody), so this spec runs alone, in order, on one project.
test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql`delete from drops`; await sql.end(); });

async function signUp(page: Page, username: string) {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(username);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
}

/** The server remembers "no drop" for ten seconds, so wait until it sees the one just inserted. */
async function waitLive(page: Page, label: string) {
  await expect.poll(async () => (await (await page.request.get('/api/drops/active')).json()).drop?.label ?? null, { timeout: 30_000, intervals: [1000] }).toBe(label);
}

test('a free drop: everyone sees the bar, a player claims it once, and it is theirs', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  const stamp = String(Date.now()).slice(-9);
  await sql`delete from drops`;
  const [d] = await sql`insert into drops (item_key, starts_at, ends_at) values ('fx-meteors', now() - interval '1 minute', now() + interval '9 minutes') returning id`;
  await waitLive(page, 'Meteor shower');

  // A guest sees what is live and is asked to sign in; the shop shows it too, with the whole collection.
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/games');
  const bar = page.locator('.drop-bar');
  await expect(bar).toContainText('Free drop: Meteor shower');
  await expect(bar.getByRole('link', { name: 'Sign in to claim' })).toBeVisible();
  await expect(bar.locator('.drop-time')).toHaveText(/^[0-9]:[0-5][0-9]$/);
  await page.goto('/shop');
  await expect(page.locator('#drops .sd-live')).toContainText('Meteor shower');
  await expect(page.locator('#drops .sd-tile')).toHaveCount(6);
  await expect(page.locator('#drops .sd-tile', { hasText: 'Meteor shower' })).toContainText('Drop only');

  // Signed in, the bar has a Claim button. Claiming gives the item and the bar says so.
  const user = `drop_${stamp}`;
  await signUp(page, user);
  await page.goto('/games');
  await bar.getByRole('button', { name: 'Claim free' }).click();
  await expect(page.locator('.drop-bar.done')).toContainText('Meteor shower is yours');
  const owned = await sql`select count(*)::int as n from user_items where item_key = 'fx-meteors' and user_id = (select id from user_accounts where username = ${user})`;
  expect(owned[0].n).toBe(1);
  const claims = await sql`select count(*)::int as n from drop_claims where drop_id = ${d.id}`;
  expect(claims[0].n).toBe(1);

  // A second claim is refused, and an owner of the item no longer sees the bar.
  const again = await page.request.post('/api/drops/claim', { data: { dropId: d.id } });
  expect(again.status()).toBe(409);
  await expect.poll(async () => (await (await page.request.get('/api/drops/active')).json()).owned, { timeout: 15_000 }).toBe(true);
  await page.goto('/shop');
  await expect(page.locator('.drop-bar')).toHaveCount(0);
  await expect(page.locator('#drops .sd-tile', { hasText: 'Meteor shower' })).toContainText('Yours');

  // The item shows up under Effects (owned drop items are listed) and equips like any other.
  await page.getByRole('button', { name: /^Effects/ }).click();
  const card = page.locator('.shop-card', { hasText: 'Meteor shower' });
  await expect(card).toContainText('From a drop');
  await card.getByRole('button', { name: 'Equip' }).click();
  await expect(card.getByRole('button', { name: /Equipped/ })).toBeVisible();

  // Nobody can buy a drop item, and a claim needs a live drop and an account.
  expect((await page.request.post('/api/shop', { data: { action: 'buy', item: 'fx-lasers' } })).status()).toBe(404);
  await sql`update drops set ends_at = now() - interval '1 second' where id = ${d.id}`;
  await expect.poll(async () => (await (await page.request.get('/api/drops/active')).json()).drop, { timeout: 30_000, intervals: [1000] }).toBeNull();
  const late = await (await browser.newContext()).request.post('/api/drops/claim', { data: { dropId: d.id } });
  expect(late.status()).toBe(401);
  await sql`delete from user_accounts where username = ${user}`;
});

test('a drop that has ended cannot be claimed', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  const stamp = String(Date.now()).slice(-9);
  await sql`delete from drops`;
  const [d] = await sql`insert into drops (item_key, starts_at, ends_at) values ('fx-lasers', now() - interval '11 minutes', now() - interval '1 minute') returning id`;
  const user = `late_${stamp}`;
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await signUp(p, user);
  const res = await p.request.post('/api/drops/claim', { data: { dropId: d.id } });
  expect(res.status()).toBe(410);
  expect((await sql`select count(*)::int as n from user_items where item_key = 'fx-lasers' and user_id = (select id from user_accounts where username = ${user})`)[0].n).toBe(0);
  await page.goto('/games');
  await expect(page.locator('.drop-bar')).toHaveCount(0);
  await sql`delete from user_accounts where username = ${user}`;
  await ctx.close();
});
