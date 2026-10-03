import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { loadGameData } from '../data';
import type { GameData } from '../types';

/** A well-known current player from any of the three leagues, for word puzzles. */
export interface PName { name: string; last: string; sport: string; team: string; position: string }

/**
 * Hand-picked five-letter sports words for Sports Wordle, so the answer is not always a surname. The hint
 * shown from the start is the kind of word.
 */
export const WORDS: { word: string; hint: 'Team name' | 'Sports term' }[] = [
  ...['BEARS', 'BILLS', 'COLTS', 'LIONS', 'MAGIC', 'KINGS', 'SPURS', 'BULLS', 'BUCKS', 'HAWKS', 'TWINS', 'BLUES', 'STARS', 'DUCKS'].map((word) => ({ word, hint: 'Team name' as const })),
  ...['BLITZ', 'PITCH', 'COURT', 'DRAFT', 'SCORE', 'SERVE', 'SKATE', 'SLIDE', 'SPIKE', 'STEAL', 'TITLE', 'TRACK', 'VAULT', 'WEDGE', 'EAGLE', 'BOGEY', 'DUNKS', 'LAYUP', 'DEUCE', 'RALLY', 'RELAY', 'FIELD', 'GLOVE', 'MOUND', 'STICK', 'GOALS', 'ARENA', 'COACH', 'SQUAD', 'MATCH', 'TRADE', 'SWEEP', 'DRIVE', 'CATCH', 'SNAPS', 'PUNTS', 'HOMER', 'BENCH', 'CHALK', 'UPSET']
    .map((word) => ({ word, hint: 'Sports term' as const })),
];
export interface PuzzleData { nfl: GameData; names: PName[] }

let cache: { at: number; data: PuzzleData } | null = null;
const lastOf = (full: string) => full.replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i, '').split(/\s+/).slice(-1)[0] ?? '';

/**
 * Puzzles draw on all three leagues: the NFL player list (Madden ratings), current NBA players rated in 2K,
 * and MLB regulars from the latest season. Only players most fans would know make the word lists. Cached 10 minutes.
 */
export async function loadPuzzleData(): Promise<PuzzleData> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const nfl = await loadGameData();
  const [nba, mlbSeason] = await Promise.all([
    db.select({ name: schema.nbaPlayers.fullName, pos: schema.nbaPlayers.rating2kPosition, team: schema.nbaPlayers.rating2kTeamId, r: schema.nbaPlayers.rating2k })
      .from(schema.nbaPlayers).where(and(isNotNull(schema.nbaPlayers.rating2k), gte(schema.nbaPlayers.rating2k, 80))).catch(() => []),
    db.select({ s: schema.mlbPlayerSeasons.season }).from(schema.mlbPlayerSeasons).orderBy(schema.mlbPlayerSeasons.season).catch(() => []),
  ]);
  const latest = mlbSeason.length ? mlbSeason[mlbSeason.length - 1].s : 0;
  const mlb = latest ? await db.select({ name: schema.mlbPlayers.fullName, pos: schema.mlbPlayerSeasons.position, team: schema.mlbPlayerSeasons.teamId })
    .from(schema.mlbPlayerSeasons).innerJoin(schema.mlbPlayers, eq(schema.mlbPlayers.id, schema.mlbPlayerSeasons.playerId))
    .where(and(eq(schema.mlbPlayerSeasons.season, latest), gte(schema.mlbPlayerSeasons.value, 85))).catch(() => []) : [];
  const names: PName[] = [
    ...nfl.players.filter((p) => p.ovr >= 85).map((p) => ({ name: p.name, last: lastOf(p.name), sport: 'NFL' as const, team: p.team, position: p.position })),
    ...nba.map((p) => ({ name: p.name, last: lastOf(p.name), sport: 'NBA' as const, team: '', position: p.pos ?? '' })),
    ...mlb.map((p) => ({ name: p.name, last: lastOf(p.name), sport: 'MLB' as const, team: '', position: p.pos })),
  ];
  const data = { nfl, names };
  cache = { at: Date.now(), data };
  return data;
}
