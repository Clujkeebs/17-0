import { expect, test, type APIRequestContext } from '@playwright/test';
import postgres from 'postgres';

// One real person has many rows (an All-time legend for each franchise, the same player in two eras or on two teams).
// A roster may hold him once. global-setup.ts plants one stand-in star on every board of each game (seedStars); each test
// drafts him and checks the next board shows him as taken and the server refuses him again.
test.describe.configure({ mode: 'serial' });
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
test.afterAll(async () => { await sql.end(); });

const STAR = { nba: 9_990_001, wnba: 9_990_002, mlb: 8_990_001, nfl: 9_990_003 };

type Row = { id: number; onRoster?: boolean; fits?: string[] };
type State = { sessionId: string; token: string; team: { players: Row[] } };

async function post(request: APIRequestContext, path: string, data: object) { return request.post(path, { data }); }

/** Start a Casual game, draft the star, then check he is marked on the next board, refused a second time, and anyone else is fine. */
async function draftTwice(request: APIRequestContext, path: string, star: number, other: (rows: Row[]) => Row | undefined) {
  const started = (await (await post(request, path, { action: 'start' })).json()) as State;
  expect(started.team.players.some((p) => p.id === star), 'the star is on the first board').toBe(true);
  const auth = { sessionId: started.sessionId, token: started.token };
  const first = await post(request, path, { action: 'pick', ...auth, playerId: star });
  expect(first.status()).toBe(200);
  const next = (await first.json()) as State;
  const again = next.team.players.find((p) => p.id === star);
  expect(again, 'the star is still listed on the next board').toBeTruthy();
  expect(again!.onRoster, 'and marked as already on the roster').toBe(true);
  const dup = await post(request, path, { action: 'pick', ...auth, playerId: star });
  expect(dup.status()).toBe(400);
  expect((await dup.json()).error).toMatch(/already on your roster/);
  const fine = other(next.team.players);
  expect(fine, 'somebody else is draftable').toBeTruthy();
  expect((await post(request, path, { action: 'pick', ...auth, playerId: fine!.id })).status()).toBe(200);
}

test('82-0: a player from two eras and teams can be drafted only once', async ({ request }) => {
  await draftTwice(request, '/api/nba/82-0', STAR.nba, (rows) => rows.find((p) => p.id !== STAR.nba));
});

test('44-0: a player from two eras and teams can be drafted only once', async ({ request }) => {
  await draftTwice(request, '/api/wnba/44-0', STAR.wnba, (rows) => rows.find((p) => p.id !== STAR.wnba));
});

test('162-0: a player from two eras and teams can be drafted only once', async ({ request }) => {
  // He takes first base; anybody else who plays a different spot is fine.
  await draftTwice(request, '/api/mlb/162-0', STAR.mlb, (rows) => rows.find((p) => p.id !== STAR.mlb && !!p.fits?.some((f) => f !== '1B' && f !== 'DH')));
});

test('17-0 All-time: a legend who starred for two franchises can be drafted only once', async ({ request }) => {
  const started = (await (await post(request, '/api/games/17-0/spin', { action: 'start', format: '6', pool: 'all-time' })).json()) as { sessionId: string; token: string; team: { id: number; players: { id: string; name: string }[] } };
  const auth = { sessionId: started.sessionId, token: started.token };
  const star = started.team.players.find((p) => p.name === 'Test Twice Legend');
  expect(star, 'the legend is on the first board').toBeTruthy();
  const first = await post(request, '/api/games/17-0/spin', { action: 'pick', ...auth, playerId: star!.id, slot: 'QB' });
  expect(first.status()).toBe(200);
  const next = (await first.json()) as { rostered?: string[]; team: { id: number; players: { id: string; name: string }[] } };
  // The next franchise's row for him is left off the board, and the board says why.
  expect(next.team.players.some((p) => p.name === 'Test Twice Legend')).toBe(false);
  expect(next.rostered).toEqual(['Test Twice Legend']);
  const [row] = await sql`select id from nfl_legends where espn_id = ${STAR.nfl} and team_id = ${next.team.id}`;
  const dup = await post(request, '/api/games/17-0/spin', { action: 'pick', ...auth, playerId: row.id, slot: 'QB' });
  expect(dup.status()).toBe(400);
  expect((await dup.json()).error).toMatch(/already on your roster/);
  // Somebody else is fine, and the note goes away once he is no longer on the board that comes up.
  const other = next.team.players.find((p) => p.name !== 'Test Twice Legend' && p.id !== row.id);
  expect(other).toBeTruthy();
});
