import { and, eq, gte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { NbaGameData } from '../nba/data';

let cache: { at: number; data: NbaGameData } | null = null;

/** Rotation players only (15+ games, 15+ minutes; WNBA seasons run 34 to 44 games). Same shape as the NBA data. Cached 10 minutes. */
export async function loadWnbaGameData(): Promise<NbaGameData> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const rows = await db.select({ ps: schema.wnbaPlayerSeasons, p: schema.wnbaPlayers, t: schema.wnbaTeamSeasons }).from(schema.wnbaPlayerSeasons)
    .innerJoin(schema.wnbaPlayers, eq(schema.wnbaPlayers.id, schema.wnbaPlayerSeasons.playerId))
    .innerJoin(schema.wnbaTeamSeasons, and(eq(schema.wnbaTeamSeasons.teamId, schema.wnbaPlayerSeasons.teamId), eq(schema.wnbaTeamSeasons.season, schema.wnbaPlayerSeasons.season)))
    .where(and(gte(schema.wnbaPlayerSeasons.gp, 15), gte(schema.wnbaPlayerSeasons.mpg, 15)))
    .orderBy(dsql`${schema.wnbaPlayerSeasons.season}, ${schema.wnbaPlayerSeasons.teamId}, ${schema.wnbaPlayerSeasons.playerId}`);
  const data: NbaGameData = {
    rated: [],
    seasons: rows.map(({ ps, p, t }) => ({
      key: `w${p.id}:${t.teamId}:${ps.season}`, playerId: p.id, name: p.fullName, position: p.position, img: p.headshot,
      teamId: t.teamId, season: ps.season, seasonLabel: String(ps.season), team: t.abbreviation, teamName: `${t.location} ${t.name}`.trim(),
      teamColor: t.color ?? '#555555', logoUrl: t.logoUrl,
      gp: ps.gp, mpg: ps.mpg, ppg: ps.ppg, rpg: ps.rpg, apg: ps.apg, spg: ps.spg, bpg: ps.bpg, value: ps.value,
    })),
  };
  cache = { at: Date.now(), data };
  return data;
}
