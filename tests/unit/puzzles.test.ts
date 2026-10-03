import { describe, expect, it } from 'vitest';
import { mark, sportsConnections, sportsWordle } from '@/lib/minigames/puzzles/games';
import type { GPlayer } from '@/lib/minigames/types';
import type { PuzzleData } from '@/lib/minigames/puzzles/data';

const TEAMS = ['Bills', 'Chiefs', 'Lions', 'Eagles', 'Ravens', '49ers'];
const COLLEGES = ['Alabama', 'Ohio State', 'Georgia', 'LSU', 'Clemson'];
const players: GPlayer[] = Array.from({ length: 240 }, (_, i) => ({
  id: `p${i}`, name: `Player ${i}`, slug: `p${i}`, position: 'WR', group: 'WR', ovr: 75 + (i % 20), teamId: i % 6, team: 'T', teamName: TEAMS[i % 6], teamColor: '#000', logoUrl: null,
  conference: 'AFC', division: 'East', college: COLLEGES[i % 5], age: 22 + (i % 14), yearsPro: i % 9, heightInches: 70 + (i % 10), weightLbs: 190 + (i % 14) * 10,
  jersey: 1 + (i % 40), archetype: null, img: null, attrs: {},
}));
const data: PuzzleData = { nfl: { players, teams: [] }, names: [
  ...['Allen', 'Kelce', 'Mahomes', 'Jokic', 'Judge', 'Brown', 'Adams', 'Burrow', 'Jones', 'Smith', 'Moore', 'Evans', 'Hurts', 'Lamar', 'Henry', 'Booker', 'Curry', 'Durant', 'James', 'Betts', 'Soto', 'Lewis', 'Watts', 'Bosch', 'Crump', 'Ozuna', 'Votto', 'Harte', 'Gibbs', 'Bijan', 'Nacua', 'Purdy'].map((last) => ({ name: `Test ${last}`, last, sport: 'NFL' as const, team: 'T', position: 'QB' })),
] };

describe('Sports Wordle', () => {
  it('marks letters like Wordle, including repeated letters', () => {
    expect(mark('ALLEN', 'ALLEN')).toEqual(['hit', 'hit', 'hit', 'hit', 'hit']);
    expect(mark('LLAMA', 'ALLEN')).toEqual(['near', 'hit', 'near', 'miss', 'miss']);
    expect(mark('EERIE', 'KELCE')).toEqual(['miss', 'hit', 'miss', 'miss', 'hit']);
  });
  it('is deterministic, hides the word, and scores fewer guesses higher', () => {
    const p = sportsWordle.generate('s1', data);
    expect(sportsWordle.generate('s1', data)).toEqual(p);
    expect(JSON.stringify(sportsWordle.publicView(p))).not.toContain(p.word);
    const two = sportsWordle.score(p, { guesses: ['ZZZZZ', p.word] }, { elapsedMs: 30_000 });
    const four = sportsWordle.score(p, { guesses: ['ZZZZZ', 'YYYYY', 'XXXXX', p.word] }, { elapsedMs: 10_000 });
    expect(two.score).toBeGreaterThan(four.score);
    expect(two.summary).toBe('2/6 · 0:30');
    expect(sportsWordle.score(p, { guesses: ['ZZZZZ'] }).score).toBe(0);
  });
});

describe('Sports Connections', () => {
  it('builds four groups of four where every player fits exactly one group', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const p = sportsConnections.generate(seed, data);
      expect(p.groups).toHaveLength(4);
      expect(new Set(p.groups.flatMap((g) => g.ids)).size).toBe(16);
      expect(p.tiles).toHaveLength(16);
      expect(JSON.stringify(sportsConnections.publicView(p))).not.toContain('label');
      expect(sportsConnections.generate(seed, data)).toEqual(p);
    }
  });
  it('checks guesses and ranks by groups, then mistakes, then time', () => {
    const p = sportsConnections.generate('x', data);
    const [g0, g1, g2, g3] = p.groups.map((g) => g.ids);
    expect(sportsConnections.check!(p, { ids: g0 }, data)).toMatchObject({ correct: true, label: p.groups[0].label });
    expect(sportsConnections.check!(p, { ids: [...g0.slice(0, 3), g1[0]] }, data)).toEqual({ correct: false, oneAway: true });
    const clean = sportsConnections.score(p, { guesses: [g0, g1, g2, g3] }, { elapsedMs: 90_000 });
    const sloppy = sportsConnections.score(p, { guesses: [[...g0.slice(0, 3), g1[0]], g0, g1, g2, g3] }, { elapsedMs: 20_000 });
    const lost = sportsConnections.score(p, { guesses: [g0, [g1[0], g2[0], g3[0], g1[1]], [g1[0], g2[0], g3[0], g1[2]], [g1[0], g2[0], g3[0], g1[3]], [g1[1], g2[0], g3[0], g1[3]]] });
    expect(clean.perfect).toBe(true);
    expect(clean.score).toBeGreaterThan(sloppy.score);
    expect(sloppy.score).toBeGreaterThan(lost.score);
    expect(clean.summary).toBe('Solved · 0 mistakes · 1:30');
    expect(lost.summary).toBe('1/4 groups');
    // Ranked play rebuilds the answer from the recorded checks.
    expect(sportsConnections.applyChecks!({ guesses: [] }, [{ ids: g0 }])).toEqual({ guesses: [g0] });
  });
});
