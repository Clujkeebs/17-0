import { positionGroup, ATTRIBUTE_KEYS } from '@/lib/game/attributes';
import type { GameData, GPlayer } from '@/lib/minigames/types';

/** Small synthetic pool: 8 players at each of several positions with spread overalls and distinct attributes. */
export function fixture(): GameData {
  const positions = ['QB', 'WR', 'CB', 'LB', 'HB', 'TE', 'DT', 'FS'];
  const players: GPlayer[] = [];
  positions.forEach((pos, pi) => {
    for (let i = 0; i < 8; i++) {
      const ovr = 62 + i * 4 + (pi % 3);
      players.push({
        id: `${pos}-${i}`, name: `${pos} Player ${i}`, slug: `${pos}-${i}`, position: pos, group: positionGroup(pos), ovr,
        teamId: 1, team: 'AAA', teamName: 'A Team', teamColor: '#000', logoUrl: null, conference: 'AFC', division: 'East',
        college: null, age: 22 + i, yearsPro: i, heightInches: 72 + (i % 4), weightLbs: 200 + i * 5, jersey: i, archetype: 'Test', img: null,
        attrs: Object.fromEntries(ATTRIBUTE_KEYS.map((k, ki) => [k, 50 + ((i * 7 + ki * 3 + pi) % 49)])),
      });
    }
  });
  return { players, teams: [] };
}
