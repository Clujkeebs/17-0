import { describe, expect, it } from 'vitest';
import { grid } from '@/lib/minigames/games/grid';
import { fixture } from './miniA-fixture';

describe('grid', () => {
  const data = fixture();
  it('is deterministic and every cell has 2+ answers', () => {
    const a = grid.generate('s1', data), b = grid.generate('s1', data);
    expect(grid.publicView(a)).toEqual(grid.publicView(b));
    expect(a.cells.every((c) => c.length >= 2)).toBe(true);
    expect(JSON.stringify(grid.publicView(a))).not.toContain('p1-');
  });
  it('scores picks, rejects reuse and bad shape', () => {
    const p = grid.generate('s2', data);
    const perfect = grid.score(p, p.cells.map((c) => c[0]));
    expect(perfect.detail).toHaveLength(9);
    const empty = grid.score(p, Array(9).fill(null));
    expect(empty.score).toBe(0);
    expect(empty.summary).toBe('0/9 · 0 pts');
    const dup = grid.score(p, [p.cells[0][0], p.cells[0][0], ...Array(7).fill(null)]);
    expect((dup.detail as { ok: boolean }[]).filter((d) => d.ok).length).toBeLessThanOrEqual(1);
    expect(() => grid.score(p, [] as never)).toThrow();
    expect(grid.check!(p, { cell: 0, playerId: p.cells[0][0] }, data)).toMatchObject({ ok: true });
    expect(grid.check!(p, { cell: 0, playerId: 'nope' }, data)).toMatchObject({ ok: false });
  });
});
