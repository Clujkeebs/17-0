import { describe, expect, it } from 'vitest';
import { fantasyRankEm, fantasyStartEm } from '@/lib/minigames/fantasy/games';
import type { FPlayer } from '@/lib/fantasy/rank';

const mk = (id: string, pos: FPlayer['pos'], value: number): FPlayer => ({ id, slug: id, name: id, pos, team: 'T', teamColor: '#000', logoUrl: null, img: null, value, recent: null, ppg: null, proj: null, games: 4, popularity: 10, trend: 0 });
const players: FPlayer[] = [
  ...Array.from({ length: 40 }, (_, i) => mk(`qb${i}`, 'QB', 24 - i * 0.4)),
  ...Array.from({ length: 60 }, (_, i) => mk(`rb${i}`, 'RB', 22 - i * 0.3)),
  ...Array.from({ length: 70 }, (_, i) => mk(`wr${i}`, 'WR', 21 - i * 0.25)),
  ...Array.from({ length: 30 }, (_, i) => mk(`te${i}`, 'TE', 15 - i * 0.4)),
];

describe("Start 'Em", () => {
  it('known names only, same position, no repeats, right calls score perfect', () => {
    const p = fantasyStartEm.generate('s', { players });
    expect(p).toEqual(fantasyStartEm.generate('s', { players }));
    const ids = p.rounds.flatMap((r) => [r.a.id, r.b.id]);
    expect(new Set(ids).size).toBe(20);
    for (const r of p.rounds) {
      expect(r.a.pos).toBe(r.b.pos);
      for (const x of [r.a, r.b]) expect(Number(x.id.slice(2))).toBeLessThan({ QB: 20, RB: 36, WR: 44, TE: 14 }[x.pos]);
    }
    expect(JSON.stringify(fantasyStartEm.publicView(p))).not.toContain('"value"');
    expect(fantasyStartEm.score(p, p.rounds.map((r) => (r.a.value >= r.b.value ? 'a' : 'b'))).perfect).toBe(true);
  });
});

describe("Rank 'Em: Fantasy", () => {
  it('five known names at one position, distinct values, true order scores perfect', () => {
    const p = fantasyRankEm.generate('r', { players });
    expect(p).toEqual(fantasyRankEm.generate('r', { players }));
    expect(p.players).toHaveLength(5);
    expect(new Set(p.players.map((x) => x.pos)).size).toBe(1);
    expect(new Set(p.players.map((x) => Math.round(x.value * 10))).size).toBe(5);
    expect(JSON.stringify(fantasyRankEm.publicView(p))).not.toContain('"value"');
    const best = [...p.players].sort((a, b) => b.value - a.value).map((x) => x.id);
    const r = fantasyRankEm.score(p, best);
    expect(r.perfect).toBe(true);
    expect(r.score).toBe(120);
    expect(fantasyRankEm.score(p, [...best].reverse()).score).toBe(4);
    expect(() => fantasyRankEm.score(p, best.slice(1))).toThrow();
  });
});
