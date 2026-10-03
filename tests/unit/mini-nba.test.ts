import { describe, expect, it } from 'vitest';
import { nbaGames as typed } from '@/lib/minigames/nba/games';
import type { MiniGame } from '@/lib/minigames/types';
import type { NbaGameData, NRated, NSeason } from '@/lib/minigames/nba/data';

// Synthetic seasons: 12 teams, 3 seasons, 8 players each with distinct numbers.
const seasons: NSeason[] = [];
for (let t = 1; t <= 12; t++) for (const season of [1996, 1997, 2005]) for (let i = 0; i < 8; i++) {
  seasons.push({ key: `${t}-${season}-${i}`, playerId: t * 100 + i + season * 10000, name: `P${t}-${i}-${season}`, position: 'G', img: null, teamId: t, season, seasonLabel: `${season - 1}-${season % 100}`,
    team: `T${t}`, teamName: `Team ${t}`, teamColor: '#123456', logoUrl: null, gp: 70, mpg: 30, ppg: 8 + i * 2.3 + t * 0.1, rpg: 3 + i * 0.9, apg: 2 + i * 0.7, spg: 0.8 + i * 0.1, bpg: 0.3 + i * 0.12, value: 70 + i * 3 });
}
// Synthetic 2K ratings: 60 current players across positions, overalls 66 to 95.
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const rated: NRated[] = Array.from({ length: 60 }, (_, i) => ({ key: `2k:${i}`, playerId: 900 + i, name: `R${i}`, position: POS[i % 5], img: null, team: `T${i % 12}`, teamName: `Team ${i % 12}`, teamColor: '#123456', logoUrl: null, ovr: 66 + (i % 30) }));
const data: NbaGameData = { seasons, rated };
const nbaGames = typed as unknown as MiniGame<unknown, unknown, NbaGameData>[];

describe('NBA mini games', () => {
  for (const g of nbaGames.filter((x) => !x.slug.startsWith('nba-2k'))) {
    it(`${g.slug}: deterministic, answer hidden from the client, all-correct scores perfect`, () => {
      const a = g.generate('seed-1', data), b = g.generate('seed-1', data);
      expect(a).toEqual(b);
      const view = JSON.stringify(g.publicView(a));
      expect(view).not.toContain('"correct"');
      expect(view).not.toContain('"ppg"');
      const rounds = (a as { rounds: { correct?: number; a?: NSeason; b?: NSeason; stat?: 'ppg' }[] }).rounds;
      const answer = rounds.map((r) => (r.correct !== undefined ? r.correct : (r.a![r.stat!] >= r.b![r.stat!] ? 'a' : 'b')));
      const s = g.score(a as never, answer as never);
      expect(s.perfect).toBe(true);
    });
  }
  it('2K higher or lower: rating hidden, right calls score perfect', () => {
    const g = nbaGames.find((x) => x.slug === 'nba-2k-higher-lower')!;
    const p = g.generate('s', data) as { rounds: { a: NRated; b: NRated }[] };
    expect(JSON.stringify(g.publicView(p))).not.toContain('"ovr"');
    expect(g.score(p as never, p.rounds.map((r) => (r.a.ovr >= r.b.ovr ? 'a' : 'b')) as never).perfect).toBe(true);
  });
  it('2K rank em: five distinct overalls, true order is perfect', () => {
    const g = nbaGames.find((x) => x.slug === 'nba-2k-rank-em')!;
    const p = g.generate('s', data) as { players: NRated[] };
    expect(new Set(p.players.map((x) => x.ovr)).size).toBe(5);
    expect(JSON.stringify(g.publicView(p))).not.toContain('"ovr"');
    const order = [...p.players].sort((a, b) => b.ovr - a.ovr).map((x) => x.key);
    expect(g.score(p as never, order as never).perfect).toBe(true);
  });
  it('2K guess: target overall hidden, anchors shown, exact guesses score 600', () => {
    const g = nbaGames.find((x) => x.slug === 'nba-2k-guess')!;
    const p = g.generate('s', data) as { rounds: { target: NRated }[] };
    const view = g.publicView(p) as { rounds: { player: object; anchors: { ovr: number }[] }[] };
    for (const r of view.rounds) { expect(r.player).not.toHaveProperty('ovr'); expect(r.anchors).toHaveLength(2); }
    expect(g.score(p as never, p.rounds.map((r) => r.target.ovr) as never).score).toBe(600);
  });
  it('2K games refuse to run without ratings', () => {
    expect(() => nbaGames.find((x) => x.slug === 'nba-2k-guess')!.generate('s', { seasons, rated: [] })).toThrow(/still loading/);
  });
  it('whose-team never offers a second right answer', () => {
    const g = nbaGames.find((x) => x.slug === 'nba-whose-team')!;
    const p = g.generate('x', data) as unknown as { rounds: { options: { id: string }[] }[] };
    for (const r of p.rounds) expect(new Set(r.options.map((o) => o.id)).size).toBe(4);
  });
});
