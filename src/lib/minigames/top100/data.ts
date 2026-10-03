import { and, desc, eq, isNotNull, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seasonLabel } from '@/lib/game/eightytwo';

/** One ranked entry: the name to find and a hint that does not give it away. */
export interface TopEntry { rank: number; name: string; hint: string; value: number }
export type TopKey = 'nfl-now' | 'nfl-all' | 'nba-now' | 'nba-all' | 'mlb-now' | 'mlb-all';
export type TopData = Record<TopKey, TopEntry[]>;

let cache: { at: number; data: TopData } | null = null;
const rank = (rows: { name: string; hint: string; value: number }[]): TopEntry[] =>
  rows.sort((a, b) => b.value - a.value).slice(0, 100).map((r, i) => ({ rank: i + 1, ...r }));

/**
 * Six separate top-100 lists, never mixed: today's players and all-time, for each league.
 * NFL now: Madden overall. NFL all-time: retired players' best graded season (ESPN history, 1980+) and the
 * classic legends. NBA now: NBA 2K overall. NBA all-time: best season value since 1984-85. MLB now: this
 * season's value. MLB all-time: best season value since 1970. Cached for an hour.
 */
export async function loadTop100(): Promise<TopData> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.data;
  const [nflNow, legends, madLegends, nbaNow, nbaAll, mlbLatest] = await Promise.all([
    db.select({ name: schema.players.fullName, pos: schema.players.position, ovr: schema.players.overallRating, team: schema.teams.abbreviation })
      .from(schema.players).innerJoin(schema.teams, eq(schema.teams.id, schema.players.teamId))
      .where(and(eq(schema.players.isActive, true), eq(schema.players.isAllTimeGreat, false))).orderBy(desc(schema.players.overallRating)).limit(150),
    db.select({ name: schema.nflLegends.fullName, pos: schema.nflLegends.group, season: schema.nflLegends.season, grade: schema.nflLegends.grade, team: schema.teams.abbreviation })
      .from(schema.nflLegends).innerJoin(schema.teams, eq(schema.teams.id, schema.nflLegends.teamId)).catch(() => []),
    db.select({ name: schema.players.fullName, pos: schema.players.position, ovr: schema.players.overallRating }).from(schema.players).where(eq(schema.players.isAllTimeGreat, true)),
    db.select({ name: schema.nbaPlayers.fullName, pos: schema.nbaPlayers.rating2kPosition, r: schema.nbaPlayers.rating2k }).from(schema.nbaPlayers).where(isNotNull(schema.nbaPlayers.rating2k)).orderBy(desc(schema.nbaPlayers.rating2k)).limit(150),
    db.execute<{ name: string; pos: string; season: number; value: number }>(dsql`
      select distinct on (p.id) p.full_name as name, p.position as pos, s.season, s.value from nba_player_seasons s join nba_players p on p.id = s.player_id
      where s.gp >= 40 order by p.id, s.value desc`).catch(() => []),
    db.select({ s: dsql<number>`max(${schema.mlbPlayerSeasons.season})::int` }).from(schema.mlbPlayerSeasons).catch(() => [{ s: 0 }]),
  ]);
  const latest = mlbLatest[0]?.s ?? 0;
  const [mlbNow, mlbAll] = await Promise.all([
    latest ? db.execute<{ name: string; pos: string; value: number }>(dsql`
      select distinct on (p.id) p.full_name as name, s.position as pos, s.value from mlb_player_seasons s join mlb_players p on p.id = s.player_id
      where s.season = ${latest} order by p.id, s.value desc`).catch(() => []) : [],
    db.execute<{ name: string; pos: string; season: number; value: number }>(dsql`
      select distinct on (p.id) p.full_name as name, s.position as pos, s.season, s.value from mlb_player_seasons s join mlb_players p on p.id = s.player_id
      order by p.id, s.value desc`).catch(() => []),
  ]);
  // A legend can be graded with several franchises; keep his best.
  const bestLegend = new Map<string, { name: string; hint: string; value: number }>();
  for (const l of legends) { const b = bestLegend.get(l.name); if (!b || l.grade > b.value) bestLegend.set(l.name, { name: l.name, hint: `${l.pos} · ${l.team} · ${l.season}`, value: l.grade }); }
  for (const m of madLegends) if (!bestLegend.has(m.name)) bestLegend.set(m.name, { name: m.name, hint: `${m.pos} · Legend`, value: m.ovr });
  const data: TopData = {
    'nfl-now': rank(nflNow.map((p) => ({ name: p.name, hint: `${p.pos} · ${p.team}`, value: p.ovr }))),
    'nfl-all': rank([...bestLegend.values()]),
    'nba-now': rank(nbaNow.map((p) => ({ name: p.name, hint: p.pos ?? '', value: p.r! }))),
    'nba-all': rank([...nbaAll].map((p) => ({ name: p.name, hint: `${p.pos} · ${seasonLabel(p.season)}`, value: p.value }))),
    'mlb-now': rank([...mlbNow].map((p) => ({ name: p.name, hint: `${p.pos} · ${latest}`, value: p.value }))),
    'mlb-all': rank([...mlbAll].map((p) => ({ name: p.name, hint: `${p.pos} · ${p.season}`, value: p.value }))),
  };
  cache = { at: Date.now(), data };
  return data;
}
