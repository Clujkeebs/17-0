import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import Redis from 'ioredis';

// Phones were checked at 375px; these cover everything between a phone and a desktop: a foldable, half of an iPad, an iPad
// upright and on its side. They run once, from the desktop project, and set their own widths.
test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
});

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('the header never collides with itself between a phone and a desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  for (const width of [540, 600, 720, 761, 768, 820, 912, 980, 981, 1024, 1100, 1180, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await sideways(page), `${width}px: page scrolls sideways`).toBe(0);
    // Every piece of the header row that is on screen sits clear of the one before it.
    const clash = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('.sh-row > *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && getComputedStyle(el).display !== 'none'; });
      const boxes = shown.map((el) => ({ name: String(el.className).split(' ')[0] || el.tagName, r: el.getBoundingClientRect() })).sort((a, b) => a.r.left - b.r.left);
      for (let i = 1; i < boxes.length; i++) if (boxes[i].r.left < boxes[i - 1].r.right - 1) return `${boxes[i - 1].name} runs into ${boxes[i].name}`;
      // The menu row itself must not spill under what follows it.
      const items = [...document.querySelectorAll('.sn-row > .sn-item')].filter((el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== 'none');
      const lastRight = Math.max(0, ...items.map((el) => el.getBoundingClientRect().right));
      const next = boxes.filter((b) => b.name !== 'brand' && b.name !== 'sn').map((b) => b.r.left);
      if (next.length && lastRight > Math.min(...next) + 1) return `menus run ${Math.round(lastRight - Math.min(...next))}px past the buttons`;
      return null;
    });
    expect(clash, `${width}px`).toBeNull();
  }
});

test('the Games menu keeps every heading whole and fits the screen on a tablet', async ({ page }) => {
  await page.goto('/');
  for (const width of [768, 912, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.sn-top', { hasText: /^Games$/ }).first().click();
    const panel = page.locator('.sn-panel.wide');
    await expect(panel).toBeVisible();
    const m = await panel.evaluate((el) => ({
      fits: el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= window.innerWidth + 1 && el.getBoundingClientRect().left >= -1,
      headings: [...el.querySelectorAll('.sn-sec-h')].filter((h) => h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent),
      columns: new Set([...el.querySelectorAll('.sn-sec')].map((s) => Math.round(s.getBoundingClientRect().left))).size,
    }));
    expect(m.fits, `${width}px: menu spills off the screen`).toBe(true);
    expect(m.headings, `${width}px: a heading is cut`).toEqual([]);
    expect(m.columns, `${width}px: four across, then a second row`).toBe(4);
    await page.keyboard.press('Escape');
  }
});

test('a page with a narrow column starts under the logo, not in the middle of the screen', async ({ page }) => {
  for (const path of ['/fantasy/rankings', '/fantasy/trade', '/credits']) {
    for (const width of [768, 1024, 1180]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const [logo, h1] = await Promise.all([page.locator('.site-header .brand').boundingBox(), page.locator('main h1').first().boundingBox()]);
      expect(Math.abs((h1?.x ?? 0) - (logo?.x ?? 99)), `${path} at ${width}px: heading ${h1?.x}, logo ${logo?.x}`).toBeLessThanOrEqual(1);
      expect(await sideways(page), `${path} at ${width}px`).toBe(0);
    }
  }
  // Sign-in is the one narrow page that stays centred.
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto('/login');
  const form = await page.locator('main h1').first().boundingBox();
  expect(form!.x).toBeGreaterThan(150);
});

test('the leaderboard keeps rank, player and result on screen from a phone to a tablet, and a pill stays inside its edge', async ({ page }) => {
  const stamp = String(Date.now()).slice(-8);
  const names = [`wide_${stamp}`, `ringy_${stamp}`];
  const looks = [{ banner: 'banner-synthwave', border: 'ring-ice' }, { banner: 'banner-plain', border: 'ring-plain' }];
  const ids: string[] = [];
  for (const [i, u] of names.entries()) {
    const [r] = await sql`insert into user_accounts (username, display_name, equip_banner, equip_border) values (${u}, ${u}, ${looks[i].banner}, ${looks[i].border}) returning id`;
    ids.push(r.id);
    await sql`insert into game_results (user_id, username, game_type, is_daily, daily_date, result_data, score) values (${r.id}, ${u}, 'mystery-player', true, ${today()}, ${sql.json({ perfect: false, summary: `Streak ${20 - i}` })}, ${9000 - i})`;
  }
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const keys = await redis.keys('*lb:*');
  if (keys.length) await redis.del(...keys);
  redis.disconnect();
  try {
    for (const width of [320, 375, 540, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/leaderboard?game=mystery-player&period=today');
      const row = page.locator('tr', { has: page.locator(`a.plate[href="/u/${names[0]}"]`) });
      await expect(row).toBeVisible();
      const m = await row.evaluate((tr) => {
        const wrap = tr.closest('.table-wrap') as HTMLElement;
        const result = tr.querySelector('td:last-child a')!.getBoundingClientRect();
        const plate = tr.querySelector('.plate')!.getBoundingClientRect();
        return { scrolls: wrap.scrollWidth - wrap.clientWidth, resultRight: result.right, plateRight: plate.right, resultLeft: result.left, vw: window.innerWidth };
      });
      expect(m.scrolls, `${width}px: the board scrolls sideways`).toBeLessThanOrEqual(1);
      expect(m.resultRight, `${width}px: the result is off screen`).toBeLessThanOrEqual(m.vw);
      expect(m.plateRight, `${width}px: the pill runs under the result`).toBeLessThanOrEqual(m.resultLeft + 1);
    }
    // A ring that glows (Ice) stays inside its pill: a halo reaching into the row is what made boards look messy.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/leaderboard?game=mystery-player&period=today');
    const ring = page.locator(`a.plate[href="/u/${names[0]}"] .ring`);
    expect(await ring.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
    // The wash is one colour fading to the page, never two colours mixed.
    const wash = await page.locator(`a.plate[href="/u/${names[0]}"]`).evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(wash).toMatch(/^linear-gradient/);
    expect((wash.match(/color-mix|rgb\(/g) ?? []).length).toBeGreaterThan(0);
  } finally {
    await sql`delete from game_results where user_id in ${sql(ids)}`;
    await sql`delete from user_accounts where id in ${sql(ids)}`;
  }
});

test('a profile banner shows its whole picture, and a long name keeps beside its title', async ({ page }) => {
  const u = `banr_${String(Date.now()).slice(-8)}`;
  await sql`insert into user_accounts (username, display_name, equip_banner, equip_border, equip_title) values (${u}, ${u + '_long_name'.slice(0, 20 - u.length)}, 'banner-founder', 'ring-plain', 'rookie')`;
  try {
    for (const width of [820, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/u/${u}`);
      const box = await page.locator('.profile-head.banner').boundingBox();
      // The art is four wide to one tall; the header keeps that shape on anything wider than a phone.
      expect(box!.width / box!.height, `${width}px`).toBeGreaterThan(3.7);
      expect(box!.width / box!.height, `${width}px`).toBeLessThan(4.3);
      expect(await sideways(page), `${width}px`).toBe(0);
    }
    // On a phone it is a little taller than a strip so the picture and name fit, and nothing runs off the side.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/u/${u}`);
    const head = await page.locator('.profile-head.banner').boundingBox();
    expect(head!.height).toBeGreaterThanOrEqual(148);
    expect(await sideways(page)).toBe(0);
    const [name, title] = await Promise.all([page.locator('.profile-head h1 .nm-text').boundingBox(), page.locator('.profile-head .nm-title').boundingBox()]);
    expect(title!.x + title!.width).toBeLessThanOrEqual(head!.x + head!.width);
    expect(name!.x + name!.width).toBeLessThanOrEqual(head!.x + head!.width);
  } finally {
    await sql`delete from user_accounts where username = ${u}`;
  }
});
