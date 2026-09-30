import { describe, expect, it } from 'vitest';
import { ratingMatch as g } from '@/lib/minigames/games/group-b';
import { fixture } from './mini-group-b-fixture';

const data = fixture();
describe('rating-match', () => {
  it('is deterministic', () => { expect(g.publicView(g.generate('x', data))).toEqual(g.publicView(g.generate('x', data))); });
  it('checks counts and scores', () => {
    const p = g.generate('y', data);
    const right = p.players.map((_, pi) => p.lines.indexOf(pi));
    expect(g.check!(p, { pairs: right }, data)).toEqual({ correct: 5 });
    expect(g.score(p, { pairs: right, attempts: 1 })).toMatchObject({ score: 50, summary: '5/5 in 1', perfect: true });
    expect(g.score(p, { pairs: right, attempts: 3 }).score).toBe(40);
    const swapped = [right[1], right[0], ...right.slice(2)];
    expect(g.score(p, { pairs: swapped, attempts: 2 })).toMatchObject({ score: 25, summary: '3/5 in 2' });
    expect(() => g.score(p, { pairs: [0, 0, 1, 2, 3], attempts: 1 })).toThrow();
    expect(() => g.score(p, { pairs: right, attempts: 4 })).toThrow();
  });
});
