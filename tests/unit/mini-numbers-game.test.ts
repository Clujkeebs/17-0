import { describe, expect, it } from 'vitest';
import { numbersGame } from '@/lib/minigames/games/group-d';
import { positionGroup, ATTRIBUTE_KEYS } from '@/lib/game/attributes';
import type { GameData, GPlayer } from '@/lib/minigames/types';

/** Ten teams of six starters each, with a repeated number on every team to prove the generator avoids it. */
function data(): GameData {
  const players: GPlayer[] = [];
  for (let t = 1; t <= 10; t++) {
    for (let i = 0; i < 6; i++) {
      players.push({
        id: `${t}-${i}`, name: `Player ${t}-${i}`, slug: `p-${t}-${i}`, position: 'WR', group: positionGroup('WR'), ovr: 72 + i,
        teamId: t, team: `T${t}`, teamName: `Team ${t}`, teamColor: '#000', logoUrl: null, conference: 'AFC', division: 'East',
        college: null, age: 25, yearsPro: 3, heightInches: 72, weightLbs: 200, jersey: i === 5 ? 10 : 10 + i, archetype: null, img: null,
        attrs: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 70])),
      });
    }
  }
  return { players, teams: [] };
}

describe('Numbers Game', () => {
  it('builds eight rounds from eight different teams, deterministically', () => {
    const a = numbersGame.generate('seed-1', data()), b = numbersGame.generate('seed-1', data());
    expect(a).toEqual(b);
    expect(a.rounds).toHaveLength(8);
    expect(new Set(a.rounds.map((r) => r.options[0].teamId)).size).toBe(8);
  });
  it('asks for a number exactly one option wears, all from the named team', () => {
    for (const r of numbersGame.generate('seed-2', data()).rounds) {
      const asked = Number(r.prompt.match(/No\. (\d+)/)![1]);
      expect(r.options.filter((o) => o.jersey === asked)).toHaveLength(1);
      expect(r.options[r.correct].jersey).toBe(asked);
      expect(new Set(r.options.map((o) => o.teamId)).size).toBe(1);
      expect(r.prompt).toContain(r.options[0].teamName);
    }
  });
  it('never sends the answer to the client and scores hits', () => {
    const p = numbersGame.generate('seed-3', data());
    expect(JSON.stringify(numbersGame.publicView(p))).not.toMatch(/"correct"|"jersey"/);
    const perfect = numbersGame.score(p, p.rounds.map((r) => r.correct));
    expect(perfect.summary).toBe('8/8');
    expect(perfect.perfect).toBe(true);
    expect(numbersGame.score(p, p.rounds.map((r) => (r.correct + 1) % 3)).score).toBe(0);
  });
});
