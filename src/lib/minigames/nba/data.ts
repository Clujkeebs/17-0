import { and, desc, eq, gte, isNotNull, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seasonLabel } from '@/lib/game/eightytwo';

/** One player's season with one franchise, flattened for NBA mini games. */
export interface NSeason {
  key: string; playerId: number; name: string; position: string; img: string | null;
  teamId: number; season: number; seasonLabel: string; team: string; teamName: string; teamColor: string; logoUrl: string | null;
  gp: number; mpg: number; ppg: number; rpg: number; apg: number; spg: number; bpg: number; value: number;
}
/** A current player with an NBA 2K overall (via NBA2KLab), on his current team. */
export interface NRated { key: string; playerId: number; name: string; position: string; img: string | null; team: string; teamName: string; teamColor: string; logoUrl: string | null; ovr: number }
export interface NbaGameData { seasons: NSeason[]; rated: NRated[] }

let cache: { at: number; data: NbaGameData } | null = null;

/** Rotation players only (40+ games, 15+ minutes), so every puzzle is about people fans have heard of. Cached 10 minutes. */
export async function loadNbaGameData(): Promise<NbaGameData> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const rows = await db.select({ ps: schema.nbaPlayerSeasons, p: schema.nbaPlayers, t: schema.nbaTeamSeasons }).from(schema.nbaPlayerSeasons)
    .innerJoin(schema.nbaPlayers, eq(schema.nbaPlayers.id, schema.nbaPlayerSeasons.playerId))
    .innerJoin(schema.nbaTeamSeasons, and(eq(schema.nbaTeamSeasons.teamId, schema.nbaPlayerSeasons.teamId), eq(schema.nbaTeamSeasons.season, schema.nbaPlayerSeasons.season)))
    .where(and(gte(schema.nbaPlayerSeasons.gp, 40), gte(schema.nbaPlayerSeasons.mpg, 15)))
    .orderBy(dsql`${schema.nbaPlayerSeasons.season}, ${schema.nbaPlayerSeasons.teamId}, ${schema.nbaPlayerSeasons.playerId}`);
  const [ratedRows, teamRows] = await Promise.all([
    db.select().from(schema.nbaPlayers).where(and(isNotNull(schema.nbaPlayers.rating2k), isNotNull(schema.nbaPlayers.rating2kTeamId))),
    db.select().from(schema.nbaTeamSeasons).orderBy(desc(schema.nbaTeamSeasons.season)),
  ]);
  const latestTeam = new Map<number, (typeof teamRows)[number]>();
  for (const t of teamRows) if (!latestTeam.has(t.teamId)) latestTeam.set(t.teamId, t);
  const data: NbaGameData = {
    rated: ratedRows.flatMap((p) => {
      const t = latestTeam.get(p.rating2kTeamId!);
      return t ? [{ key: `2k:${p.id}`, playerId: p.id, name: p.fullName, position: p.rating2kPosition ?? p.position, img: p.headshot, team: t.abbreviation, teamName: `${t.location} ${t.name}`.trim(), teamColor: t.color ?? '#555555', logoUrl: t.logoUrl, ovr: p.rating2k! }] : [];
    }),
    seasons: rows.map(({ ps, p, t }) => ({
      key: `${p.id}:${t.teamId}:${ps.season}`, playerId: p.id, name: p.fullName, position: p.position, img: p.headshot,
      teamId: t.teamId, season: ps.season, seasonLabel: seasonLabel(ps.season), team: t.abbreviation, teamName: `${t.location} ${t.name}`.trim(),
      teamColor: t.color ?? '#555555', logoUrl: t.logoUrl,
      gp: ps.gp, mpg: ps.mpg, ppg: ps.ppg, rpg: ps.rpg, apg: ps.apg, spg: ps.spg, bpg: ps.bpg, value: ps.value,
    })),
  };
  cache = { at: Date.now(), data };
  return data;
}

/** The card a client sees: who, which season, which team. Never the numbers being asked about. */
export const ncard = (s: NSeason) => ({ id: s.key, name: s.name, position: `${s.position} · ${s.seasonLabel}`, team: s.team, teamName: s.teamName, teamColor: s.teamColor, logoUrl: s.logoUrl, img: s.img });

/** Card for a 2K-rated player: never the overall. */
export const rcard = (r: NRated) => ({ id: r.key, name: r.name, position: r.position, team: r.team, teamName: r.teamName, teamColor: r.teamColor, logoUrl: r.logoUrl, img: r.img });
