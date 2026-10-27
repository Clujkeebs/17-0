import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/db';
import { MLB_COLORS, mlbHeadshot, mlbLogo } from '@/lib/server/mlb-game';
import { DATASET_TTL_MS, memoAsync } from '@/lib/memo';
import type { BatLine, MlbKind, PitchLine } from '@/lib/game/onesixtytwo';

import type { BSeason, MlbGameData } from './card';
export type { BSeason, MlbGameData } from './card';
export { bcard } from './card';

/** Every graded season since 1970 (everyday hitters, starters, relievers). In memory for an hour. */
export const loadMlbGameData = memoAsync(DATASET_TTL_MS, async (): Promise<MlbGameData> => {
  const rows = await db.select({ ps: schema.mlbPlayerSeasons, p: schema.mlbPlayers, t: schema.mlbTeamSeasons }).from(schema.mlbPlayerSeasons)
    .innerJoin(schema.mlbPlayers, eq(schema.mlbPlayers.id, schema.mlbPlayerSeasons.playerId))
    .innerJoin(schema.mlbTeamSeasons, and(eq(schema.mlbTeamSeasons.teamId, schema.mlbPlayerSeasons.teamId), eq(schema.mlbTeamSeasons.season, schema.mlbPlayerSeasons.season)));
  const data: MlbGameData = {
    seasons: rows.map(({ ps, p, t }) => {
      const kind = ps.kind as MlbKind;
      return {
        key: `${p.id}:${t.teamId}:${ps.season}`, playerId: p.id, name: p.fullName, position: ps.position, kind, img: mlbHeadshot(p.id),
        teamId: t.teamId, season: ps.season, team: t.abbreviation, teamName: `${t.location} ${t.name}`.trim(), teamColor: MLB_COLORS[t.teamId] ?? '#1F2A44', logoUrl: mlbLogo(t.teamId) || null,
        bat: kind === 'bat' ? (ps.line as BatLine) : null, pitch: kind === 'bat' ? null : (ps.line as PitchLine), value: ps.value,
      };
    }),
  };
  return data;
});
