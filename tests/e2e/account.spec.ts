import { expect, test } from '@playwright/test';
import postgres from 'postgres';

// Full lifecycle: register, sign in, play the daily, see the streak and leaderboard, admin view, delete, verify data gone.
test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

test('account lifecycle', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run is enough; mobile covers the games');
  const u = `e2e_${Date.now().toString(36)}`;
  const email = process.env.E2E_ADMIN_EMAIL ?? 'you@example.com';
  await sql`delete from user_accounts where email = ${email}`;
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); localStorage.setItem('gl-17-0-rules', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto('/register');
  await page.locator('#reg-username').fill(u);
  await page.locator('#reg-email').fill(email);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/login/);
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  await page.goto('/games/17-0?mode=today');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('group', { name: 'Difficulty' }).locator('label', { hasText: /^Easy/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('.g-player:not([disabled])').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await expect(page.locator('.g-slots li.filled')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Simulate the season' }).first().click();
  await page.waitForURL(/\/results\//);

  await page.goto('/profile');
  await expect(page.getByText(/🔥/)).toBeVisible();
  await expect(page.locator('body')).toContainText('1');
  await expect(page.locator('.stat', { hasText: 'Best 17-0 record' })).toContainText(/\d+-\d+/);
  await expect(page.locator('.grade-sub', { hasText: /^Today$/ }).first()).toBeVisible();

  // Profile: edit the display name, locked styles stay locked, header shows the name, share and public page work.
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Display name').fill('E2E Tester');
  await expect(page.getByRole('radiogroup', { name: 'Font' }).getByRole('radio').last()).toBeDisabled();
  await page.locator('.pe-chip', { hasText: '17-0' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('h1')).toContainText('E2E Tester');
  await expect(page.locator('.hp')).toContainText('E2E Tester');
  await page.getByRole('button', { name: 'Share profile' }).first().click();
  const sms = page.getByRole('dialog', { name: 'Share' }).getByRole('link', { name: /Text message/ });
  expect(decodeURIComponent((await sms.getAttribute('href'))!)).toMatch(new RegExp(`^sms:\\?&body=https?://[^ ]+/u/${u}$`));
  await page.getByRole('button', { name: 'Done' }).click();
  await page.goto(`/u/${u}`);
  await expect(page.locator('h1')).toContainText('E2E Tester');
  await expect(page.locator('main').getByRole('link', { name: '17-0', exact: true })).toBeVisible();
  await expect(page.locator('.owner-tag')).toHaveCount(0);

  await page.goto('/leaderboard?tab=daily&game=17-0');
  await expect(page.getByRole('cell', { name: u })).toBeVisible();

  // Admin (email is whitelisted in ADMIN_EMAILS): dashboard renders and manual sync queues.
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Run sync now' })).toBeVisible();
  const exp = await page.request.get('/api/user/export');
  expect(exp.status()).toBe(200);
  expect(JSON.stringify(await exp.json())).toContain(email);

  // Delete account.
  await page.goto('/settings');
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: /Delete/ }).click();
  await page.waitForURL(/deleted=1/);
  const rows = await sql`select id from user_accounts where email = ${email}`;
  expect(rows.length).toBe(0);
  const anon = await sql`select username, user_id from game_results where username like 'deleted-user-%' order by created_at desc limit 1`;
  expect(anon[0].user_id).toBeNull();
  expect((await request.get('/api/user/profile')).status()).toBe(401);
});

test('newsletter double opt-in: subscribe, confirm, unsubscribe', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop');
  const email = `nl+${Date.now()}@example.com`;
  expect((await request.post('/api/newsletter/subscribe', { data: { email, source: 'e2e' } })).status()).toBe(200);
  const [row] = await sql`select confirmation_token, unsubscribe_token, confirmed from newsletter_subscribers where email = ${email}`;
  expect(row.confirmed).toBe(false);
  const c = await request.get(`/api/newsletter/confirm?token=${row.confirmation_token}`, { maxRedirects: 0 });
  expect(c.headers().location).toContain('/newsletter/confirmed');
  expect((await sql`select confirmed from newsletter_subscribers where email = ${email}`)[0].confirmed).toBe(true);
  const un = await request.post(`/api/newsletter/unsubscribe?token=${row.unsubscribe_token}`, { form: { 'List-Unsubscribe': 'One-Click' } });
  expect(un.status()).toBe(200);
  expect((await sql`select unsubscribed_at from newsletter_subscribers where email = ${email}`)[0].unsubscribed_at).not.toBeNull();
});

test('owner account gets the owner style; nobody else can', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop');
  const owner = 'clujkeebs@aol.com';
  await sql`delete from user_accounts where email = ${owner}`;
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(`own_${Date.now().toString(36)}`);
  await page.locator('#reg-email').fill(owner);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/login/);
  await page.locator('#login-email').fill(owner);
  await page.locator('#login-password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await page.goto('/profile');
  await expect(page.locator('h1 .owner-tag')).toHaveText('[OWNER]');
  await expect(page.locator('h1 .nm-text')).toHaveClass(/nm-f-neon/);
  await expect(page.locator('h1 .nm-text')).toHaveClass(/nm-c-rainbow/);
  // Even the owner cannot "equip" the owner keys through the API, and nobody can name themselves [OWNER].
  expect((await page.request.patch('/api/user/profile', { data: { nameFont: 'neon' } })).status()).toBe(403);
  expect((await page.request.patch('/api/user/profile', { data: { displayName: '[OWNER]' } })).status()).toBe(400);
  await sql`delete from user_accounts where email = ${owner}`;
  void request;
});
