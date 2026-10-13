import { expect, test } from '@playwright/test';

type Slot = { key: string };
type Player = { id: string; name: string; slots?: string[]; group: string; legend?: boolean; line?: string };
type State = { sessionId: string; done: boolean; team: { name: string; players: Player[] } | null; slots: Slot[]; picks: { slot?: string }[] };

// All-time 17-0 offers each franchise's legendary head coaches next to its current one: draft one, finish the roster, and he grades.
test('17-0 All-time: a legend head coach is on the board, can be drafted, and counts in the grade', async ({ request }) => {
  test.setTimeout(90_000);
  const call = async (body: object) => { const r = await request.post('/api/games/17-0/spin', { data: body }); expect(r.status()).toBe(200); return r.json(); };
  const started = await call({ action: 'start', format: '6', pool: 'all-time' });
  const token: string = started.token;
  let s = started as State;
  const legend = () => s.team?.players.find((p) => p.id.startsWith('lcoach:'));
  for (let i = 0; i < 2 && !legend(); i++) s = await call({ action: 'respin', sessionId: s.sessionId, token });
  const hc = legend();
  test.skip(!hc, 'none of the three boards had a legend head coach');
  expect(hc!.group).toBe('HC');
  expect(hc!.legend).toBe(true);
  expect(hc!.line).toMatch(/^\d{4}-\d{2}/);
  s = await call({ action: 'pick', sessionId: s.sessionId, token, playerId: hc!.id, slot: 'HC' });
  // Fill the other five spots with whoever fits an open one.
  for (let n = 0; n < 8 && !s.done; n++) {
    const taken = new Set(s.picks.map((p) => p.slot));
    const open = new Set(s.slots.map((x) => x.key).filter((k) => !taken.has(k)));
    const next = s.team!.players.find((p) => (p.slots ?? []).some((k) => open.has(k)));
    expect(next, 'a player for an open spot').toBeTruthy();
    s = await call({ action: 'pick', sessionId: s.sessionId, token, playerId: next!.id, slot: (next!.slots ?? []).find((k) => open.has(k)) });
  }
  expect(s.done).toBe(true);
  const graded = await request.post('/api/games/17-0/grade', { data: { sessionId: s.sessionId, token } });
  expect(graded.status()).toBe(200);
  const out = await graded.json();
  const coach = out.result.picks.find((p: { group: string }) => p.group === 'HC');
  expect(coach.name).toBe(hc!.name);
  expect(out.result.pool).toBe('all-time');
});

test('a legend head coach is refused in the current pool', async ({ request }) => {
  const r = await request.post('/api/games/17-0/spin', { data: { action: 'start', format: '6', pool: 'current' } });
  const s = await r.json();
  const bad = await request.post('/api/games/17-0/spin', { data: { action: 'pick', sessionId: s.sessionId, token: s.token, playerId: 'lcoach:shula-mia', slot: 'HC' } });
  expect(bad.status()).toBe(400);
});
