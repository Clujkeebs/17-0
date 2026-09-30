import { describe, expect, it } from 'vitest';
import { mysteryPlayer, clues } from '@/lib/minigames/games/mystery-player';
import { fixture } from './miniA-fixture';

describe('mystery-player', () => {
  const data = fixture();
  it('is deterministic and hides the target', () => {
    const a = mysteryPlayer.generate('x', data), b = mysteryPlayer.generate('x', data);
    expect(a.target.id).toBe(b.target.id);
    expect(a.target.ovr).toBeGreaterThanOrEqual(75);
    expect(JSON.stringify(mysteryPlayer.publicView(a))).not.toContain(a.target.id);
  });
  it('scores 9 minus guesses, 0 on a miss', () => {
    const p = mysteryPlayer.generate('y', data);
    const other = data.players.find((x) => x.id !== p.target.id)!.id;
    expect(mysteryPlayer.score(p, [p.target.id]).score).toBe(8);
    expect(mysteryPlayer.score(p, [other, other, p.target.id]).score).toBe(6);
    expect(mysteryPlayer.score(p, Array(8).fill(other)).score).toBe(0);
    expect(() => mysteryPlayer.score(p, Array(9).fill(other))).toThrow();
  });
  it('builds clues with direction and hint after guess 5', () => {
    const p = mysteryPlayer.generate('z', data);
    const g = data.players.find((x) => x.id !== p.target.id)!;
    const c = clues(g, p.target);
    expect(['up', 'down', 'exact']).toContain(c.ovr.dir);
    expect((mysteryPlayer.check!(p, { id: g.id, n: 2 }, data) as { hint: unknown }).hint).toBeNull();
    expect((mysteryPlayer.check!(p, { id: g.id, n: 5 }, data) as { hint: string }).hint).toBeTruthy();
  });
});
