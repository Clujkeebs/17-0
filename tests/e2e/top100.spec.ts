import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('Top 100 NFL Now: find a player, miss one, finish and see the list', async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  const [top] = await sql`select full_name from players where is_active and not is_all_time_great and team_id is not null order by overall_rating desc limit 1`;
  await sql.end();
  await page.addInitScript(() => { localStorage.setItem('gl-cookie-ack', '1'); });
  await page.goto('/games/top-100-nfl-now');
  await page.getByRole('tab', { name: 'Casual' }).click();
  const box = page.getByLabel("Type a player's name");
  await expect(box).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.t100-grid li')).toHaveCount(100);
  await box.fill(top.full_name);
  await box.press('Enter');
  await expect(page.locator('.t100-count')).toHaveText('1/100');
  await box.fill('Nobody McNotaplayer');
  await box.press('Enter');
  await expect(page.locator('.hint').filter({ hasText: 'Not on this list' })).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Finish with 1' }).click();
  await expect(page.locator('.m-score')).toHaveText(/^1\/100/);
  await expect(page.locator('.m-result .t100-grid li.found')).toHaveCount(1);
  // Now and All-time are separate lists.
  await page.getByRole('navigation', { name: 'List' }).getByRole('link', { name: 'All-time' }).click();
  await expect(page).toHaveURL(/top-100-nfl-all/);
});
