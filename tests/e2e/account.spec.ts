import { expect, test } from '@playwright/test';
import postgres from 'postgres';

// Full lifecycle: register, sign in, play the daily, see the streak and leaderboard, admin view, delete, verify data gone.
test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

test('account lifecycle', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run is enough; mobile covers the games');
  const u = `e2e_${String(Date.now()).slice(-9)}`;
  const email = process.env.E2E_ADMIN_EMAIL ?? 'you@example.com';
  await sql`delete from user_accounts where email = ${email}`;
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); localStorage.setItem('gl-17-0-rules', '1'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto('/register');
  await page.locator('#reg-username').fill(u);
  await page.locator('#reg-email').fill(email);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  // Sign-up signs you straight in.
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));

  await page.goto('/games/17-0?mode=today');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await sheet.getByRole('button', { name: /More options/ }).click();
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
  await expect(page.locator('.hp')).toContainText('Account');
  await expect(page.locator('.hp')).toHaveAttribute('title', 'E2E Tester');
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
  await page.locator('#reg-username').fill(`own_${String(Date.now()).slice(-9)}`);
  await page.locator('#reg-email').fill(owner);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  // Sign-up signs you straight in.
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
  await page.goto('/profile');
  await expect(page.locator('h1 .owner-tag')).toHaveText('[OWNER]');
  await expect(page.locator('h1 .nm-text')).toHaveClass(/nm-f-neon/);
  await expect(page.locator('h1 .nm-text')).toHaveClass(/nm-c-rainbow/);
  // Even the owner cannot "equip" the owner keys through the API, and nobody can name themselves [OWNER].
  expect((await page.request.patch('/api/user/profile', { data: { nameFont: 'neon' } })).status()).toBe(403);
  expect((await page.request.patch('/api/user/profile', { data: { displayName: '[OWNER]' } })).status()).toBe(400);
  // Own profile lists every badge, the unearned ones greyed out.
  await expect(page.locator('.badges h2')).toContainText('of 17');
  await page.locator('.badges-more summary').click();
  await expect(page.locator('.badges .badge')).toHaveCount(17);
  // Daily Double: the owner moves it to today, the shop says so; then switches it off and the note goes away.
  const todayIdx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })).getDay();
  expect((await page.request.post('/api/owner/manage', { data: { action: 'double', day: todayIdx } })).ok()).toBe(true);
  await page.goto('/shop');
  await expect(page.locator('.double-note.on')).toContainText('Daily Double today');
  expect((await page.request.post('/api/owner/manage', { data: { action: 'double', day: null } })).ok()).toBe(true);
  await page.goto('/shop');
  await expect(page.locator('.double-note')).toHaveCount(0);
  await page.request.post('/api/owner/manage', { data: { action: 'double', day: 6 } });
  await sql`delete from user_accounts where email = ${owner}`;
  void request;
});

test('sign up with just a username and password, then sign back in with the username', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const u = `noemail_${String(Date.now()).slice(-9)}`;
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(u);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
  await expect(page.locator('.hp')).toBeVisible();
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#login-email').fill(u.toUpperCase());
  await page.locator('#login-password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await expect(page.locator('.hp')).toBeVisible();
  // Signed in, a fresh visit opens on Today; after a Casual game it opens on Casual.
  await page.goto('/games/82-0');
  const sheet = page.getByRole('dialog', { name: 'Game setup' });
  await expect(sheet.getByRole('group', { name: 'Mode' }).getByRole('radio', { name: /Today/ })).toBeChecked();
  await sheet.getByRole('group', { name: 'Mode' }).locator('label', { hasText: /^Casual/ }).click();
  await sheet.getByRole('button', { name: 'Start' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: /New team/ })).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/games/82-0');
  await expect(page.getByRole('dialog', { name: 'Game setup' }).getByRole('group', { name: 'Mode' }).getByRole('radio', { name: /Casual/ })).toBeChecked();
  await sql`delete from user_accounts where username = ${u}`;
});

test('owner page: only the owner sees it, notes save and log', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop');
  // Signed out: the 404 page (Next streams it with a 200), never the notes.
  expect(await (await request.get('/owner')).text()).not.toContain('What should change?');
  expect((await request.post('/api/owner/notes', { data: { body: 'x' } })).status()).toBe(404);
  const owner = 'clujkeebs@aol.com';
  await sql`delete from user_accounts where email = ${owner}`;
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/register');
  await page.locator('#reg-username').fill(`own2_${String(Date.now()).slice(-9)}`);
  await page.locator('#reg-email').fill(owner);
  await page.locator('main input[type=password]').first().fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register') && !url.pathname.startsWith('/login'));
  await page.goto('/profile');
  await page.getByRole('link', { name: 'Notes to Claude' }).click();
  await page.getByLabel('What should change?').fill('e2e: the reel is slow on school laptops');
  await page.getByRole('button', { name: 'Send note' }).click();
  await expect(page.getByRole('status')).toContainText('Sent');
  await expect(page.locator('.owner-notes')).toContainText('the reel is slow');
  await page.getByRole('button', { name: /Clear caches/ }).click();
  await expect(page.getByRole('status')).toContainText('Caches cleared');
  // Owner tools: live numbers, points, a site banner, and no access for anyone else.
  await expect(page.locator('.stat', { hasText: 'Games today' })).toBeVisible();
  const me = (await page.locator('h1').count()) ? await page.evaluate(() => fetch('/api/user/me').then((r) => r.json())) : null;
  await page.getByLabel('Username').fill(me.username);
  await page.getByRole('button', { name: 'Give points' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Gave 100 points' })).toBeVisible();
  await page.getByLabel('Message across the top of every page').fill('e2e banner: new games are live');
  await page.getByRole('button', { name: 'Put it up' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Banner is up' })).toBeVisible();
  await page.goto('/games');
  await expect(page.locator('.site-banner')).toContainText('e2e banner');
  await page.goto('/owner');
  await page.getByRole('button', { name: 'Take it down' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Banner removed' })).toBeVisible();
  expect((await request.post('/api/owner/manage', { data: { action: 'stats' } })).status()).toBe(404);
  await sql`delete from owner_notes where body like 'e2e:%'`;
  await sql`delete from user_accounts where email = ${owner}`;
});
