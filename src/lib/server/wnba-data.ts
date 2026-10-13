import { and, gte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getRedis } from './redis';
import { WNBA_ERAS, WNBA_MIN_GP, wnbaValue, type WnbaSpin } from '@/lib/game/fortyfour';

/** Where a season sits in the 44-0 data, shared by the game and the worker's calibrator. */

type PsLine = { season: number; gp: number; mpg: number; ppg: number; rpg: number; apg: number; spg: number; bpg: number; tov: number | null; fgPct: number | null; tpPct: number | null; ftPct: number | null };

/** Games in each season's schedule, read from the data (the most any player logged for one team): 22 in 2020, 44 now. */
export async function seasonGames(): Promise<Record<number, number>> {
  const r = getRedis();
  const cached = await r.get('wnba:season-games').catch(() => null);
  if (cached) return JSON.parse(cached);
  const rows = await db.select({ season: schema.wnbaPlayerSeasons.season, g: dsql<number>`max(${schema.wnbaPlayerSeasons.gp})::int` }).from(schema.wnbaPlayerSeasons).groupBy(schema.wnbaPlayerSeasons.season);
  const out: Record<number, number> = Object.fromEntries(rows.map((x) => [x.season, x.g]));
  if (rows.length) await r.set('wnba:season-games', JSON.stringify(out), 'EX', 3600).catch(() => {});
  return out;
}

/** A player-season's 44-0 value: the stored per-game line scored with this season's schedule length. */
export function lineValue(ps: PsLine, games: Record<number, number>): number {
  return wnbaValue({ gp: ps.gp, mpg: ps.mpg, ppg: ps.ppg, rpg: ps.rpg, apg: ps.apg, spg: ps.spg, bpg: ps.bpg, tov: ps.tov, fgPct: ps.fgPct, tpPct: ps.tpPct, ftPct: ps.ftPct }, games[ps.season] ?? 34);
}

export interface WnbaBoards { teams: Record<WnbaSpin, number[]>; /** The season Right now drafts from. */ nowSeason: number | null }

/** A franchise needs this many qualifying players in an era (or this season) to have a board. */
const MIN_BOARD = 5;
/** Right now needs this many franchises with a board in the season. */
const MIN_NOW_TEAMS = 8;

/** Franchises with a real board in each era and in the Right now season, cached for an hour. */
export async function eraTeams(): Promise<WnbaBoards> {
  const r = getRedis();
  const cached = await r.get('wnba:era-teams').catch(() => null);
  if (cached) return JSON.parse(cached);
  const per = await db.select({ teamId: schema.wnbaPlayerSeasons.teamId, season: schema.wnbaPlayerSeasons.season, n: dsql<number>`count(distinct ${schema.wnbaPlayerSeasons.playerId})::int` })
    .from(schema.wnbaPlayerSeasons).where(gte(schema.wnbaPlayerSeasons.gp, WNBA_MIN_GP)).groupBy(schema.wnbaPlayerSeasons.teamId, schema.wnbaPlayerSeasons.season);
  // A franchise also needs its name and colors for the era, so a board is never drawn for a team the page cannot show.
  const named = await db.select({ teamId: schema.wnbaTeamSeasons.teamId, season: schema.wnbaTeamSeasons.season }).from(schema.wnbaTeamSeasons);
  const hasName = (t: number, from: number, to: number) => named.some((n) => n.teamId === t && n.season >= from && n.season <= to);
  // Right now: the latest season with enough franchises (a new season only counts once its rosters have played a few games).
  const bySeason = new Map<number, number[]>();
  for (const x of per) if (x.n >= MIN_BOARD && hasName(x.teamId, x.season, x.season)) bySeason.set(x.season, [...(bySeason.get(x.season) ?? []), x.teamId]);
  const nowSeason = [...bySeason].filter(([, t]) => t.length >= MIN_NOW_TEAMS).map(([s]) => s).sort((a, b) => b - a)[0] ?? null;
  const teams = {} as Record<WnbaSpin, number[]>;
  for (const e of WNBA_ERAS) {
    const rows = await db.select({ teamId: schema.wnbaPlayerSeasons.teamId, n: dsql<number>`count(distinct ${schema.wnbaPlayerSeasons.playerId})::int` })
      .from(schema.wnbaPlayerSeasons)
      .where(and(gte(schema.wnbaPlayerSeasons.season, e.from), dsql`${schema.wnbaPlayerSeasons.season} <= ${e.to}`, gte(schema.wnbaPlayerSeasons.gp, WNBA_MIN_GP)))
      .groupBy(schema.wnbaPlayerSeasons.teamId);
    teams[e.key] = rows.filter((x) => x.n >= MIN_BOARD && hasName(x.teamId, e.from, e.to)).map((x) => x.teamId).sort((a, b) => a - b);
  }
  teams.now = nowSeason == null ? [] : [...(bySeason.get(nowSeason) ?? [])].filter((t) => hasName(t, nowSeason, nowSeason)).sort((a, b) => a - b);
  const out: WnbaBoards = { teams, nowSeason };
  if (WNBA_ERAS.every((e) => teams[e.key].length) && nowSeason != null) await r.set('wnba:era-teams', JSON.stringify(out), 'EX', 3600).catch(() => {});
  return out;
}

/** The years a spin covers: an era's span, or just the Right now season. */
export function spanOf(era: WnbaSpin, nowSeason: number | null) {
  if (era === 'now') { const y = nowSeason ?? 0; return { key: 'now' as const, label: String(y), from: y, to: y }; }
  const e = WNBA_ERAS.find((x) => x.key === era)!;
  return { key: e.key, label: e.label, from: e.from, to: e.to };
}

/** 44-0 opens once every era has enough franchises to spin; Right now once a recent season has enough rosters. */
export async function wnbaReady(mode: 'eras' | 'now' = 'eras'): Promise<boolean> {
  try {
    const b = await eraTeams();
    return mode === 'now' ? b.nowSeason != null && b.teams.now.length >= MIN_NOW_TEAMS : WNBA_ERAS.every((e) => b.teams[e.key].length >= 8);
  } catch { return false; }
}
