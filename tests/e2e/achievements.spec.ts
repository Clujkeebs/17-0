import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';

test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

async function signUp(page: Page, username: string) {
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(username);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
}

test('achievements: the first game unlocks one and tells you, hidden ones stay a mystery until found', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const user = `ach_${String(Date.now()).slice(-9)}`;
  await signUp(page, user);
  // The first look at the profile settles the baseline; nothing earned yet.
  await page.goto('/profile');
  await expect(page.locator('#badges')).toBeVisible();
  // A brand new account has earned next to nothing (Early Adopter, while the site is new, is the only one it can have).
  expect(Number((await page.locator('#badges h2').textContent())!.match(/(\d+) of/)![1])).toBeLessThanOrEqual(1);
  expect(await page.locator('#badges .badge.secret').count()).toBeGreaterThanOrEqual(8);
  await expect(page.locator('#badges .badge.secret').first()).toContainText('Hidden achievement');
  // Hidden ones give a hint, not the answer.
  await expect(page.locator('#badges .badge.secret', { hasText: 'Some people never sleep' })).toHaveCount(1);
  await expect(page.locator('#badges')).not.toContainText('Insomniac');

  // A finished game earns First Down; the next look at the profile records it and the bell says so.
  const [{ id }] = await sql`select id from user_accounts where username = ${user}`;
  await sql`insert into game_results (user_id, username, game_type, is_daily, result_data, score) values (${id}, ${user}, 'higher-lower', false, '{"perfect":true,"summary":"10/10"}'::jsonb, 100)`;
  const before = (await sql`select points from user_accounts where id = ${id}`)[0].points as number;
  await page.goto('/profile');
  await expect(page.locator('#badges .badge.on', { hasText: 'First Down' })).toBeVisible();
  const notes = await (await page.request.get('/api/notifications')).json();
  expect(notes.items.map((n: { title: string }) => n.title)).toContain('Achievement unlocked: First Down');
  expect((await sql`select points from user_accounts where id = ${id}`)[0].points).toBe(before + 10);   // a bronze pays 10, once
  await page.goto('/profile');
  expect((await sql`select count(*)::int as n from point_events where user_id = ${id} and reason = 'badge'`)[0].n).toBe(1);
  const again = await (await page.request.get('/api/notifications')).json();
  expect(again.items.filter((n: { title: string }) => n.title === 'Achievement unlocked: First Down')).toHaveLength(1);

  // A public profile shows only what is earned.
  await page.goto(`/u/${user}`);
  await expect(page.locator('#badges .badge.on', { hasText: 'First Down' })).toHaveCount(1);
  await expect(page.locator('#badges .badge:not(.on)')).toHaveCount(0);
  await expect(page.locator('#badges .badge.secret')).toHaveCount(0);
  await sql`delete from user_accounts where username = ${user}`;
});

test('the old cheat code unlocks a hidden achievement and pays nothing', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop');
  expect((await request.post('/api/secret', { data: { code: 'konami' } })).status()).toBe(401);
  const user = `kon_${String(Date.now()).slice(-9)}`;
  await signUp(page, user);
  await page.goto('/games');
  const [{ id }] = await sql`select id from user_accounts where username = ${user}`;
  const before = (await sql`select points from user_accounts where id = ${id}`)[0].points as number;
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
  await expect(page.locator('.konami-toast')).toContainText('Cheat code accepted');
  expect((await sql`select count(*)::int as n from user_badges where user_id = ${id} and badge_key = 'konami'`)[0].n).toBe(1);
  expect((await sql`select points from user_accounts where id = ${id}`)[0].points).toBe(before);
  // Typing it into a form field does nothing; a second entry and a wrong code are not new.
  expect((await (await page.request.post('/api/secret', { data: { code: 'konami' } })).json()).fresh).toBe(false);
  expect((await (await page.request.post('/api/secret', { data: { code: 'xyzzy' } })).json()).fresh).toBe(false);
  await page.goto('/profile');
  await expect(page.locator('#badges .badge.on', { hasText: 'The Code' })).toBeVisible();
  await sql`delete from user_accounts where username = ${user}`;
});
