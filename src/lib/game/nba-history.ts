import { seasonRaw, valueFromRaw, type SeasonLine } from './eightytwo';

/**
 * The '60s and '70s of 82-0. ESPN has almost nothing for these years, so the per-game lines come from Wikipedia's
 * career tables (data/nba-history/history.json, built by scripts/crawl-nba-history.mjs and scripts/build-nba-history.mjs).
 * Pace, rebounding and the shot count of those leagues are nothing like today's, so a raw line is not comparable: each
 * season is graded against its own league and then placed on the scale the modern seasons use.
 */

/** First and last seasons covered, by end year: 1960 is 1959-60. */
export const HISTORY_FIRST = 1960;
export const HISTORY_LAST = 1979;
/** The league first counted steals and blocks in 1973-74. Before that they are left out for everyone. */
export const STOCKS_FROM = 1974;
/** Mean and spread of the composite over today's rotation players (40+ games, 15+ minutes, 1985 to 2027, from ESPN). */
export const MODERN_RAW = { mean: 22.5, sd: 9.9 } as const;

export interface HistoryLine extends SeasonLine { season: number }

const isRotation = (l: SeasonLine) => l.gp >= 40 && l.mpg >= 15;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], m: number) => Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);

/**
 * One 82-0 value per line, in the order given. Within a season every line is scored on the same composite, turned into
 * a z-score against that season's rotation players, and mapped onto the modern mean and spread, so a 1962 big man's
 * 25 rebounds and a 1996 guard's 25 points land where their standing in their own league puts them.
 */
export function historyValues(lines: HistoryLine[]): number[] {
  const bySeason = new Map<number, number[]>();
  lines.forEach((l, i) => bySeason.set(l.season, [...(bySeason.get(l.season) ?? []), i]));
  const out = new Array<number>(lines.length);
  for (const [season, idx] of bySeason) {
    // Count steals and blocks only when the season recorded them for most of its rotation.
    const rot = idx.filter((i) => isRotation(lines[i]));
    const recorded = rot.length ? rot.filter((i) => (lines[i].spg ?? 0) > 0 || (lines[i].bpg ?? 0) > 0).length / rot.length : 0;
    const stocks = season >= STOCKS_FROM && recorded >= 0.75;
    const raws = idx.map((i) => seasonRaw(lines[i], { stocks }));
    const basis = (rot.length >= 12 ? rot.map((i) => raws[idx.indexOf(i)]) : raws);
    const m = mean(basis), s = Math.max(1, sd(basis, m));
    idx.forEach((i, k) => {
      const mapped = MODERN_RAW.mean + ((raws[k] - m) / s) * MODERN_RAW.sd;
      out[i] = valueFromRaw(mapped, lines[i].gp);
    });
  }
  return out;
}
