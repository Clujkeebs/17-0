import { describe, expect, it } from 'vitest';
import { wheresHeFrom, streakPoints } from '@/lib/minigames/games/wheres-he-from';
import { fixture } from './miniA-fixture';

describe('wheres-he-from', () => {
  const data = fixture();
  it('is deterministic with 4 distinct choices including the answer', () => {
    const a = wheresHeFrom.generate('q', data);
    expect(wheresHeFrom.publicView(a)).toEqual(wheresHeFrom.publicView(wheresHeFrom.generate('q', data)));
    for (const r of a.rounds) { expect(new Set(r.choices).size).toBe(4); expect(r.choices).toContain(r.p.college); }
  });
  it('scores with streak bonus', () => {
    expect(streakPoints([true, true, true, false, true])).toBe(100 + 125 + 150 + 100);
    const p = wheresHeFrom.generate('r', data);
    const res = wheresHeFrom.score(p, p.rounds.map((r) => r.p.college!));
    expect(res.perfect).toBe(true);
    expect(res.score).toBe(streakPoints([true, true, true, true, true]));
    expect(() => wheresHeFrom.score(p, ['x'])).toThrow();
  });
});
