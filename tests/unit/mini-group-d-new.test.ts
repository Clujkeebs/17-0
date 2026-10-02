import { describe, expect, it } from 'vitest';
import { divisionLine, sizeUp, vetCheck } from '@/lib/minigames/games/group-d';
import { positionGroup, ATTRIBUTE_KEYS } from '@/lib/game/attributes';
import type { GameData, GPlayer } from '@/lib/minigames/types';

/** 8 divisions x 4 teams x 5 players, with spread heights and experience. */
function data(): GameData {
  const players: GPlayer[] = [];
  const divs = ['East', 'North', 'South', 'West'];
  let id = 0;
  for (const conf of ['AFC', 'NFC']) for (const division of divs) for (let t = 0; t < 4; t++) {
    const teamId = (conf === 'AFC' ? 0 : 16) + divs.indexOf(division) * 4 + t + 1;
    for (let i = 0; i < 5; i++) {
      id++;
      players.push({
        id: `p${id}`, name: `Player ${id}`, slug: `p-${id}`, position: 'WR', group: positionGroup('WR'), ovr: 72 + (id % 20),
        teamId, team: `T${teamId}`, teamName: `Team ${teamId}`, teamColor: '#000', logoUrl: null, conference: conf, division,
        college: null, age: 22 + (id % 12), yearsPro: id % 13, heightInches: 68 + (id % 11), weightLbs: 200, jersey: null, archetype: null, img: null,
        attrs: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 70])),
      });
    }
  }
  return { players, teams: [] };
}

describe('Size Up and Vet Check', () => {
  for (const [game, field] of [[sizeUp, 'heightInches'], [vetCheck, 'yearsPro']] as const) {
    it(`${game.slug}: eight deterministic rounds with a clear answer`, () => {
      const p = game.generate('s1', data());
      expect(p).toEqual(game.generate('s1', data()));
      expect(p.rounds).toHaveLength(8);
      for (const r of p.rounds) {
        const [a, b] = r.options.map((o) => o[field]!);
        expect(a).not.toBe(b);
        expect(r.options[r.correct][field]).toBe(Math.max(a, b));
      }
      expect(JSON.stringify(game.publicView(p))).not.toMatch(/heightInches|yearsPro|"correct"/);
      expect(game.score(p, p.rounds.map((r) => r.correct)).summary).toBe('8/8');
    });
  }
});

describe('Division Line', () => {
  it('three share a division, the odd one is from another division of the same conference', () => {
    const p = divisionLine.generate('s2', data());
    expect(p.rounds).toHaveLength(6);
    for (const r of p.rounds) {
      const odd = r.options[r.correct];
      const rest = r.options.filter((_, i) => i !== r.correct);
      expect(new Set(rest.map((o) => `${o.conference} ${o.division}`)).size).toBe(1);
      expect(new Set(rest.map((o) => o.teamId)).size).toBe(3);
      expect(`${odd.conference} ${odd.division}`).not.toBe(`${rest[0].conference} ${rest[0].division}`);
      expect(odd.conference).toBe(rest[0].conference);
    }
    expect(JSON.stringify(divisionLine.publicView(p))).not.toMatch(/"division"|"conference"|"correct"/);
  });
});
