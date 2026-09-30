import { describe, expect, it } from 'vitest';
import { topTen } from '@/lib/minigames/games/top-ten';
import { fixture } from './_gc-fixture';

const data = fixture();
describe('top-ten', () => {
  it('is deterministic and hides answers', () => {
    expect(topTen.generate('s1', data)).toEqual(topTen.generate('s1', data));
    const p = topTen.generate('s1', data);
    expect(p.top).toHaveLength(10);
    expect(JSON.stringify(topTen.publicView(p))).not.toContain(p.top[0].id);
  });
  it('scores found players, bonus for #1, stops at three strikes', () => {
    const p = topTen.generate('s2', data);
    const ids = p.top.map((t) => t.id);
    expect(topTen.score(p, { guesses: ids }).score).toBe(105);
    const r = topTen.score(p, { guesses: ['x1', ids[1], 'x2', 'x3', ids[0]] });
    expect(r.score).toBe(10);
    expect(topTen.score(p, { guesses: [ids[0], ids[0]] }).score).toBe(15);
    expect(topTen.check!(p, { id: ids[2] }, data)).toMatchObject({ hit: true, rank: 3 });
    expect(() => topTen.score(p, { guesses: 'x' } as never)).toThrow();
  });
});
