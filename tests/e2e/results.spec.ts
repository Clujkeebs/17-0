import { expect, test } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

test('the result of a game that was taken down shows the 404 page, once, not a crash', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  // Unbeaten Bowl was taken down, but its old results stay in the table and old share links still point at them.
  const [r] = await sql`insert into game_results (game_type, is_daily, result_data, score)
    values ('unbeaten-bowl', false, ${sql.json({ detail: { pf: 9, pa: 7, you: 'KC', opp: 'HOU' }, perfect: false, summary: 'W 9-7 KC vs HOU' })}, 16209) returning id`;
  try {
    // Next streams a not-found page with a 200, so the proof is what the page shows: the 404 words, not the error page,
    // with one header and one main landmark (the 404 used to bring its own header inside a layout that already had one).
    await page.goto(`/results/${r.id}`);
    await expect(page.getByRole('heading', { name: 'Incomplete pass.' })).toBeVisible();
    await expect(page.getByText(/something broke on our end/i)).toHaveCount(0);
    await expect(page.locator('header.site-header')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
  } finally {
    await sql`delete from game_results where id = ${r.id}`;
  }
});
