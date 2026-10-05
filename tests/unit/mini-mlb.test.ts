import { describe, expect, it } from 'vitest';
import { mlbGames as typed, knownSeasons, bLine } from '@/lib/minigames/mlb/games';
import type { MiniGame } from '@/lib/minigames/types';
import type { BSeason, MlbGameData } from '@/lib/minigames/mlb/data';

// Synthetic history: 14 teams, 4 seasons, 9 hitters, 2 starters and a closer each, all with distinct numbers.
const seasons: BSeason[] = [];
for (let t = 1; t <= 14; t++) for (const season of [1998, 2001, 2004, 2019]) for (let i = 0; i < 12; i++) {
  const id = t * 1000 + i + season * 100000, kind = i < 9 ? 'bat' : i < 11 ? 'sp' : 'rp';
  seasons.push({ key: `${id}`, playerId: id, name: `P${id}`, position: kind === 'bat' ? 'SS' : kind.toUpperCase(), kind, img: '', teamId: t, season, team: `T${t}`, teamName: `Team ${t}`, teamColor: '#123', logoUrl: null,
    bat: kind === 'bat' ? { pa: 600, ops: 0.7 + i * 0.03, hr: 15 + i * 3 + t, sb: 15 + i * 2 + (t % 4), avg: 0.26 + i * 0.006 + t * 0.001, obp: 0.33, slg: 0.45, rbi: 60 + i * 7 + t } : null,
    pitch: kind === 'bat' ? null : { gs: 30, g: 60, ip: 200, era: 3, so: 120 + i * 5 + t * 6, sv: kind === 'rp' ? 20 + t * 2 : 0, w: 10 + (t % 9), whip: 1.1 },
    value: 66 + i * 2 + (t % 5) });
}
const data: MlbGameData = { seasons };
const mlbGames = typed as unknown as MiniGame<unknown, unknown, MlbGameData>[];

describe('Baseball mini games', () => {
  for (const g of mlbGames) {
    it(`${g.slug}: deterministic, numbers hidden from the client, all-correct is perfect`, () => {
      const a = g.generate('seed-1', data), b = g.generate('seed-1', data);
      expect(a).toEqual(b);
      const view = JSON.stringify(g.publicView(a));
      expect(view).not.toContain('"correct"');
      expect(view).not.toContain('"hr"');
      const rounds = (a as { rounds: { correct?: number }[] }).rounds;
      if (g.slug === 'mlb-rank-em') {
        const r = g.score(a as never, (a as { players: { key: string }[] }).players.map((x) => x.key) as never) as { detail: { truth: { id: string }[] } };
        expect(g.score(a as never, r.detail.truth.map((x) => x.id) as never).perfect).toBe(true);
      } else if (g.slug === 'mlb-higher-lower') {
        const d = g.score(a as never, rounds.map(() => 'a') as never) as { detail: { av: number | string; bv: number | string }[] };
        const best = d.detail.map((x) => (Number(x.av) >= Number(x.bv) ? 'a' : 'b'));
        expect(g.score(a as never, best as never).perfect).toBe(true);
      } else {
        expect(g.score(a as never, rounds.map((r) => r.correct) as never).perfect).toBe(true);
      }
    });
  }
  it("mlb-rank-em: five different players, five different numbers, one stat", () => {
    const g = mlbGames.find((x) => x.slug === 'mlb-rank-em')!;
    for (const seed of ['a', 'b', 'c', 'd']) {
      const p = g.generate(seed, data) as { stat: string; players: BSeason[] };
      expect(new Set(p.players.map((x) => x.playerId)).size).toBe(5);
      const get = (x: BSeason) => ({ hr: x.bat?.hr, rbi: x.bat?.rbi, sb: x.bat?.sb, so: x.pitch?.so, sv: x.pitch?.sv } as Record<string, number | undefined>)[p.stat];
      expect(p.players.every((x) => get(x) !== undefined)).toBe(true);
      expect(new Set(p.players.map(get)).size).toBe(5);
    }
  });
  it('only well-known players: no season below the cutoff, lines read cleanly', () => {
    const known = knownSeasons(data);
    expect(known.every((s) => s.value >= 70)).toBe(true);
    expect(bLine(known.find((s) => s.kind === 'bat')!)).toMatch(/^\.\d{3}, \d+ HR, \d+ RBI, \d+ SB, \.\d{3} OPS$/);
  });
});
