import { and, eq, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seasonLabel } from '@/lib/game/eightytwo';
import type { NbaGameData } from '../nba/data';

type Hoops = 'mbb' | 'wbb';
const hoopsCache = new Map<Hoops, { at: number; data: NbaGameData }>();

/**
 * College basketball in the same shape as the NBA data, so the four hoops games run on it unchanged. Rotation players
 * only (15+ games, 15+ minutes), from the programs the sync follows. Cached 10 minutes.
 */
export async function loadCollegeHoops(league: Hoops): Promise<NbaGameData> {
  const hit = hoopsCache.get(league);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.data;
  const rows = await db.select({ h: schema.collegeHoops, p: schema.collegePlayers, t: schema.collegeTeams }).from(schema.collegeHoops)
    .innerJoin(schema.collegePlayers, and(eq(schema.collegePlayers.league, schema.collegeHoops.league), eq(schema.collegePlayers.id, schema.collegeHoops.playerId)))
    .innerJoin(schema.collegeTeams, and(eq(schema.collegeTeams.league, schema.collegeHoops.league), eq(schema.collegeTeams.id, schema.collegeHoops.teamId)))
    .where(and(eq(schema.collegeHoops.league, league), gte(schema.collegeHoops.gp, 15), gte(schema.collegeHoops.mpg, 15)));
  rows.sort((a, b) => a.h.season - b.h.season || a.h.teamId - b.h.teamId || a.h.playerId - b.h.playerId);
  const data: NbaGameData = {
    rated: [],
    seasons: rows.map(({ h, p, t }) => ({
      key: `c${league}${p.id}:${t.id}:${h.season}`, playerId: p.id, name: p.name, position: p.position ?? 'G', img: p.headshot,
      teamId: t.id, season: h.season, seasonLabel: seasonLabel(h.season), team: t.abbreviation, teamName: t.name, teamColor: t.color ?? '#555555', logoUrl: t.logoUrl,
      gp: h.gp, mpg: h.mpg, ppg: h.ppg, rpg: h.rpg, apg: h.apg, spg: h.spg, bpg: h.bpg, value: h.value,
    })),
  };
  hoopsCache.set(league, { at: Date.now(), data });
  return data;
}

/** One player's number in one category for one team's season, ready for the football games. */
export interface CfbLine {
  key: string; playerId: number; name: string; position: string; img: string | null;
  teamId: number; season: number; team: string; teamName: string; teamColor: string; logoUrl: string | null;
  category: string; value: number; display: string | null; rank: number;
}
export interface CfbData { lines: CfbLine[] }
let cfbCache: { at: number; data: CfbData } | null = null;

/** Every stat leader the sync stored for college football. Cached 10 minutes. */
export async function loadCollegeFootball(): Promise<CfbData> {
  if (cfbCache && Date.now() - cfbCache.at < 10 * 60_000) return cfbCache.data;
  const rows = await db.select({ l: schema.collegeLeaders, p: schema.collegePlayers, t: schema.collegeTeams }).from(schema.collegeLeaders)
    .innerJoin(schema.collegePlayers, and(eq(schema.collegePlayers.league, schema.collegeLeaders.league), eq(schema.collegePlayers.id, schema.collegeLeaders.playerId)))
    .innerJoin(schema.collegeTeams, and(eq(schema.collegeTeams.league, schema.collegeLeaders.league), eq(schema.collegeTeams.id, schema.collegeLeaders.teamId)))
    .where(eq(schema.collegeLeaders.league, 'cfb'));
  rows.sort((a, b) => a.l.season - b.l.season || a.l.teamId - b.l.teamId || a.l.category.localeCompare(b.l.category) || a.l.rank - b.l.rank);
  const data: CfbData = {
    lines: rows.map(({ l, p, t }) => ({
      key: `cfb${p.id}:${l.season}:${l.category}`, playerId: p.id, name: p.name, position: p.position ?? '', img: p.headshot,
      teamId: t.id, season: l.season, team: t.abbreviation, teamName: t.name, teamColor: t.color ?? '#555555', logoUrl: t.logoUrl,
      category: l.category, value: l.value, display: l.display, rank: l.rank,
    })),
  };
  cfbCache = { at: Date.now(), data };
  return data;
}
