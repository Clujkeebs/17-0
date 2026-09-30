import { describe, expect, it } from 'vitest';
import { guessTheOvr as g, goPoints } from '@/lib/minigames/games/group-b';
import { fixture } from './mini-group-b-fixture';

const data = fixture();
describe('guess-the-ovr', () => {
  it('is deterministic with no leak', () => {
    const p = g.generate('z', data);
    expect(g.publicView(p)).toEqual(g.publicView(g.generate('z', data)));
    const v = g.publicView(p) as { rounds: { player: Record<string, unknown>; anchors: unknown[] }[] };
    for (const r of v.rounds) { expect(r.player.ovr).toBeUndefined(); expect(r.anchors).toHaveLength(2); }
  });
  it('scores', () => {
    const p = g.generate('z', data);
    const exact = p.rounds.map((r) => r.target.ovr);
    expect(g.score(p, exact)).toMatchObject({ score: 600, perfect: true, summary: '600 pts' });
    expect(goPoints(80, 83)).toBe(70);
    expect(goPoints(60, 90)).toBe(0);
    expect(() => g.score(p, [1, 2, 3, 4, 5, 6])).toThrow();
  });
});
