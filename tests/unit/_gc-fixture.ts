import type { GameData, GPlayer } from '@/lib/minigames/types';
import { positionGroup } from '@/lib/game/attributes';

export function fixture(): GameData {
  const teams = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, abbr: `T${i}`, name: `Team${i}`, city: `City${i}`, color: '#000', logoUrl: null, conference: 'AFC', division: i < 2 ? 'North' : 'South' }));
  const pos = ['QB', 'HB', 'WR', 'TE', 'DE', 'MLB', 'CB', 'FS'];
  const players: GPlayer[] = [];
  let n = 0;
  for (const p of pos) for (let k = 0; k < 14; k++) {
    const t = teams[n % 4]; n++;
    players.push({ id: `p${n}`, name: `Player ${n}`, slug: `p${n}`, position: p, group: positionGroup(p), ovr: 60 + ((n * 7) % 39), teamId: t.id, team: t.abbr, teamName: `${t.city} ${t.name}`, teamColor: '#000', logoUrl: null, conference: 'AFC', division: t.division, college: `U${n % 5}`, age: 25, yearsPro: 3, heightInches: 72, weightLbs: 200, jersey: 1, archetype: null, img: null, attrs: { speed: 70 + ((n * 3) % 29), awareness: 60 + (n % 37), catching: 50 + (n % 45), throwPower: 80 + (n % 19), tackle: 50 + ((n * 5) % 47) } as GPlayer['attrs'] });
  }
  return { teams, players };
}
