import { describe, expect, it } from 'vitest';
import { rankEm } from '@/lib/minigames/games/rank-em';
import { fixture } from './_gc-fixture';

const data = fixture();
describe('rank-em', () => {
  it('is deterministic', () => { expect(rankEm.generate('a', data)).toEqual(rankEm.generate('a', data)); });
  it('scores pairs and exact slots', () => {
    const p = rankEm.generate('b', data);
    const sorted = [...p.players].sort((a, b) => b.v - a.v).map((x) => x.p.id);
    expect(rankEm.score(p, sorted)).toMatchObject({ score: 120, perfect: true });
    expect(rankEm.score(p, [...sorted].reverse()).detail).toMatchObject({ pairs: 0 });
    const swap = [sorted[1], sorted[0], ...sorted.slice(2)];
    expect(rankEm.score(p, swap)).toMatchObject({ score: 9 * 10 + 3 * 4 });
    expect(() => rankEm.score(p, sorted.slice(1))).toThrow();
  });
});
