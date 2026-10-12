import { PUZZLES, weekdayOf, type BadgeFacts } from './badges';

/**
 * The result side of the achievement facts, from three small summaries of a player's results (so a player with
 * thousands of games costs a few dozen rows, not thousands). Pure, so it is tested with made-up rows.
 */
const LEN: Record<string, number> = { '17-0': 17, '82-0': 82, '162-0': 162 };

/** Results grouped by game and how they were played; `wins` is a season game's record, `flag` a mini's own "perfect". */
export type ResultGroup = { game: string; daily: boolean; hard: boolean; format: string; pool: string; wins: number | null; flag: boolean; n: number };
/** When games finished, by Eastern hour and minute. */
export type HourRow = { h: number; m: number; n: number };
/** One Eastern day of play. */
export type DayRow = { date: string; n: number; types: number; perfect: number; seasonPerfect: number; puzzlePerfect: number };

const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

export function resultFacts(groups: ResultGroup[], hours: HourRow[], days: DayRow[]): Pick<BadgeFacts,
  'perfect' | 'played' | 'seasonPerfect' | 'perfectHard' | 'perfectAllTime' | 'perfect53' | 'perfectFantasy' | 'closeCalls' | 'strongSeasons' | 'drySeasons' | 'evenSeasons'
  | 'games' | 'ranked' | 'perfectMinis' | 'perfectGames' | 'puzzlesPerfect' | 'nightGames' | 'earlyGames' | 'midnightGames' | 'mostInADay' | 'mostTypesInADay' | 'weekendPairs' | 'hatTricks' | 'perfectStorms' | 'backToBack'> {
  let played = 0, ranked = 0, closeCalls = 0, strong = 0, dry = 0, even = 0, perfectHard = 0, perfectAllTime = 0, perfect53 = 0, perfectFantasy = 0, perfectMinis = 0;
  const perfect: Record<string, number> = {}, seasonPerfect: Record<string, number> = {};
  const games = new Set<string>(), perfectGames = new Set<string>(), puzzles = new Set<string>();
  for (const g of groups) {
    played += g.n; if (g.daily) ranked += g.n; games.add(g.game);
    const season = g.game in LEN && g.wins !== null;
    const perfectRun = season ? g.wins === LEN[g.game] : g.flag;
    if (perfectRun) { perfect[g.game] = (perfect[g.game] ?? 0) + g.n; perfectGames.add(g.game); if (PUZZLES.includes(g.game)) puzzles.add(g.game); }
    if (season) {
      const len = LEN[g.game], w = g.wins as number;
      if (perfectRun) {
        seasonPerfect[g.game] = (seasonPerfect[g.game] ?? 0) + g.n;
        if (g.hard) perfectHard += g.n;
        if (g.game === '17-0') { if (g.pool === 'all-time') perfectAllTime += g.n; if (g.format === '53') perfect53 += g.n; if (g.format === 'fantasy') perfectFantasy += g.n; }
      }
      if (w === len - 1) closeCalls += g.n;
      if (w / len >= 0.8) strong += g.n;
      if (w / len <= 0.02) dry += g.n;
      // 17 games cannot split evenly, so 8-9 and 9-8 count; the long seasons need exactly half.
      if (len === 17 ? w === 8 || w === 9 : w * 2 === len) even += g.n;
    } else if (perfectRun && g.game !== 'build-a-player') perfectMinis += g.n;
  }
  let night = 0, early = 0, midnight = 0;
  for (const r of hours) {
    if (r.h >= 1 && r.h < 4) night += r.n; else if (r.h >= 4 && r.h < 7) early += r.n;
    if (r.h === 0 && r.m < 5) midnight += r.n;
  }
  const dates = new Set(days.map((d) => d.date));
  const perfectDays = new Set(days.filter((d) => d.seasonPerfect > 0).map((d) => d.date));
  return {
    perfect, played, seasonPerfect, perfectHard, perfectAllTime, perfect53, perfectFantasy, closeCalls, strongSeasons: strong, drySeasons: dry, evenSeasons: even,
    games: games.size, ranked, perfectMinis, perfectGames: perfectGames.size, puzzlesPerfect: [...puzzles],
    nightGames: night, earlyGames: early, midnightGames: midnight,
    mostInADay: Math.max(0, ...days.map((d) => d.n)), mostTypesInADay: Math.max(0, ...days.map((d) => d.types)),
    weekendPairs: [...dates].filter((d) => weekdayOf(d) === 6 && dates.has(nextDay(d))).length,
    hatTricks: days.filter((d) => d.perfect >= 3).length,
    perfectStorms: days.filter((d) => d.seasonPerfect > 0 && d.puzzlePerfect > 0).length,
    backToBack: [...perfectDays].filter((d) => perfectDays.has(nextDay(d))).length,
  };
}
