import { expect, test } from '@playwright/test';
import postgres from 'postgres';

// A page Next makes on demand is kept in a capped in-memory cache and never written to .next/server/app (next.config.ts), so a crawler
// walking /compare pairs cannot fill the container with page files. That cache has to stay on: the second request for the same
// address is served from it and does not render again.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

test('a page made on demand comes back from the in-memory cache the second time', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'headers do not depend on the viewport');
  const players = await sql`select slug from players where is_active order by overall_rating desc limit 2`;
  expect(players.length).toBe(2);
  const pair = `/compare/${players[0].slug}-vs-${players[1].slug}`;
  expect((await request.get(pair)).status(), pair).toBe(200);
  expect((await request.get(pair)).headers()['x-nextjs-cache'], pair).toBe('HIT');
  // A made-up address is stored too, so a crawler guessing addresses costs one render each and no memory beyond the cap.
  for (const path of ['/players/zzz-not-real', '/compare/aaa-vs-bbb', '/blog/zzz-not-a-post']) {
    await request.get(path);
    expect((await request.get(path)).headers()['x-nextjs-cache'], path).toBe('HIT');
  }
});
