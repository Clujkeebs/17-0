import { describe, expect, it } from 'vitest';
import { parseScoreboard, payouts } from '@/lib/server/pickem';

const ev = (id: string, state: string, completed: boolean, hs: string, as: string, homeWin?: boolean) => ({
  id, date: '2026-10-05T17:00Z',
  competitions: [{ status: { type: { state, completed } }, competitors: [
    { homeAway: 'home', winner: homeWin === true, score: hs, team: { abbreviation: 'BUF', displayName: 'Buffalo Bills', logo: 'https://a.espncdn.com/buf.png' } },
    { homeAway: 'away', winner: homeWin === false, score: as, team: { abbreviation: 'KC', displayName: 'Kansas City Chiefs', logo: null } },
  ] }],
});

describe('Pick em scoreboard parsing', () => {
  it('reads games, scores and winners', () => {
    const rows = parseScoreboard({ season: { year: 2026, type: 2 }, week: { number: 5 }, events: [
      ev('1', 'pre', false, '0', '0'), ev('2', 'in', false, '14', '10'), ev('3', 'post', true, '27', '30', false), ev('4', 'post', true, '20', '20'),
    ] });
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ id: '1', season: 2026, week: 5, homeAbbr: 'BUF', awayAbbr: 'KC', status: 'pre', homeScore: null, winner: null });
    expect(rows[1]).toMatchObject({ status: 'in', homeScore: 14, awayScore: 10, winner: null });
    expect(rows[2]).toMatchObject({ status: 'post', winner: 'away' });
    expect(rows[3]).toMatchObject({ status: 'post', winner: 'tie' });
  });
  it('returns nothing for a malformed response', () => {
    expect(parseScoreboard({})).toEqual([]);
    expect(parseScoreboard({ season: { year: 2026 }, week: { number: 1 }, events: [{ id: 'x' }] })).toEqual([]);
  });
});

describe('Pick em payouts', () => {
  const g = (id: string, week: number, status: string, winner: string | null) => ({ id, season: 2026, week, status, winner });
  it('pays right picks on finals and a perfect week only when the whole week is final', () => {
    const games = [g('a', 1, 'post', 'home'), g('b', 1, 'post', 'away'), g('c', 2, 'post', 'home'), g('d', 2, 'pre', null), g('e', 1, 'post', 'tie')];
    const picks = [
      { userId: 'u1', gameId: 'a', pick: 'home' }, { userId: 'u1', gameId: 'b', pick: 'away' }, { userId: 'u1', gameId: 'e', pick: 'home' },
      { userId: 'u2', gameId: 'a', pick: 'away' }, { userId: 'u2', gameId: 'c', pick: 'home' }, { userId: 'u2', gameId: 'd', pick: 'home' },
    ];
    const out = payouts(games, picks);
    expect(out.filter((p) => p.reason === 'pickem').map((p) => `${p.userId}:${p.ref}`).sort()).toEqual(['u1:a', 'u1:b', 'u2:c']);
    // Week 1 has a tie, so nobody can be perfect; week 2 is not final yet.
    expect(out.filter((p) => p.reason === 'pickem-week')).toEqual([]);
  });
  it('pays the perfect week once all games are final and right', () => {
    const games = [g('a', 3, 'post', 'home'), g('b', 3, 'post', 'away')];
    const out = payouts(games, [{ userId: 'u', gameId: 'a', pick: 'home' }, { userId: 'u', gameId: 'b', pick: 'away' }, { userId: 'v', gameId: 'a', pick: 'home' }]);
    expect(out.filter((p) => p.reason === 'pickem-week')).toEqual([{ userId: 'u', amount: 50, reason: 'pickem-week', ref: '2026:3' }]);
  });
});
