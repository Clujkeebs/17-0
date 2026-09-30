import { describe, expect, it } from 'vitest';
import { blindResume as g } from '@/lib/minigames/games/group-b';
import { fixture } from './mini-group-b-fixture';

const data = fixture();
describe('blind-resume', () => {
  it('is deterministic and leak-free', () => {
    const a = g.generate('s1', data), b = g.generate('s1', data);
    expect(g.publicView(a)).toEqual(g.publicView(b));
    expect(JSON.stringify(g.publicView(a))).not.toMatch(/"name":"[^"]+","position":"[^"]+"[^}]*"ovr"/);
    for (const r of a.rounds) { expect(r.options).toHaveLength(4); expect(new Set(r.options.map((o) => o.position)).size).toBe(1); expect(r.keys.length).toBeGreaterThan(0); }
  });
  it('scores with confidence', () => {
    const p = g.generate('s2', data);
    const right = p.rounds.map((r) => r.target.id);
    expect(g.score(p, { picks: right, confident: 0 }).score).toBe(6);
    const wrong = p.rounds.map((r) => r.options.find((o) => o.id !== r.target.id)!.id);
    expect(g.score(p, { picks: [right[0], ...wrong.slice(1)], confident: 1 }).score).toBe(0);
    expect(g.score(p, { picks: [right[0], right[1], ...wrong.slice(2)], confident: 4 }).score).toBe(1);
    expect(g.check!(p, { round: 0, pick: right[0] }, data)).toMatchObject({ ok: true });
    expect(() => g.score(p, { picks: [], confident: null })).toThrow();
  });
});
