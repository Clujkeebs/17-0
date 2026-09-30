import type { GameData, GPlayer, GTeam } from '@/lib/minigames/types';
import { positionGroup } from '@/lib/game/attributes';

const POS = ['QB', 'HB', 'WR', 'WR', 'TE', 'LT', 'C', 'DT', 'LE', 'MLB', 'CB', 'CB', 'FS', 'SS'];
const COL = ['Alabama', 'Ohio State', 'Georgia', 'LSU', 'Texas', 'Michigan'];

/** Small deterministic synthetic pool: 6 teams x 14 players. */
export function fixture(): GameData {
  const teams: GTeam[] = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, abbr: `T${i + 1}`, name: `Team${i + 1}`, city: 'City', color: '#123456', logoUrl: null, conference: i < 3 ? 'AFC' : 'NFC', division: i % 3 === 0 ? 'East' : 'West' }));
  const players: GPlayer[] = [];
  teams.forEach((t) => POS.forEach((pos, j) => {
    const k = t.id * 31 + j * 7;
    players.push({
      id: `p${t.id}-${j}`, name: `Player ${t.id}-${j}`, slug: `p${t.id}-${j}`, position: pos, group: positionGroup(pos), ovr: 70 + (k % 25),
      teamId: t.id, team: t.abbr, teamName: `City ${t.name}`, teamColor: t.color, logoUrl: null, conference: t.conference, division: t.division,
      college: COL[k % COL.length], age: 21 + (k % 12), yearsPro: k % 8 === 0 ? 0 : k % 10, heightInches: 70 + (k % 9), weightLbs: 220, jersey: k % 99,
      archetype: null, img: null, attrs: { speed: 80 + (k % 16) },
    });
  }));
  return { teams, players };
}
