import type { BatLine, MlbKind, PitchLine } from '@/lib/game/onesixtytwo';

/** One player's season with one franchise, flattened for baseball mini games. */
export interface BSeason {
  key: string; playerId: number; name: string; position: string; kind: MlbKind; img: string;
  teamId: number; season: number; team: string; teamName: string; teamColor: string; logoUrl: string | null;
  bat: BatLine | null; pitch: PitchLine | null; value: number;
}
export interface MlbGameData { seasons: BSeason[] }

/** The card a client sees: who, which season, which team. Never the numbers being asked about. */
export const bcard = (s: BSeason) => ({ id: s.key, name: s.name, position: `${s.position} · ${s.season}`, team: s.team, teamName: s.teamName, teamColor: s.teamColor, logoUrl: s.logoUrl, img: s.img });
