import { describe, expect, it } from 'vitest';
import { nbaGames as typed } from '@/lib/minigames/nba/games';
import type { MiniGame } from '@/lib/minigames/types';
import type { NbaGameData, NSeason } from '@/lib/minigames/nba/data';

// Synthetic seasons: 12 teams, 3 seasons, 8 players each with distinct numbers.
const seasons: NSeason[] = [];
for (let t = 1; t <= 12; t++) for (const season of [1996, 1997, 2005]) for (let i = 0; i < 8; i++) {
  seasons.push({ key: `${t}-${season}-${i}`, playerId: t * 100 + i + season * 10000, name: `P${t}-${i}-${season}`, position: 'G', img: null, teamId: t, season, seasonLabel: `${season - 1}-${season % 100}`,
    team: `T${t}`, teamName: `Team ${t}`, teamColor: '#123456', logoUrl: null, gp: 70, mpg: 30, ppg: 8 + i * 2.3 + t * 0.1, rpg: 3 + i * 0.9, apg: 2 + i * 0.7, spg: 0.8 + i * 0.1, bpg: 0.3 + i * 0.12, value: 70 + i * 3 });
}
const data: NbaGameData = { seasons };
const nbaGames = typed as unknown as MiniGame<unknown, unknown, NbaGameData>[];

describe('NBA mini games', () => {
  for (const g of nbaGames) {
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
  it('whose-team never offers a second right answer', () => {
    const g = nbaGames.find((x) => x.slug === 'nba-whose-team')!;
    const p = g.generate('x', data) as unknown as { rounds: { options: { id: string }[] }[] };
    for (const r of p.rounds) expect(new Set(r.options.map((o) => o.id)).size).toBe(4);
  });
});
